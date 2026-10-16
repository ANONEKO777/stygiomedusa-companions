# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""夥伴包的驗證與打包; 只用 Python 標準函式庫.

    uv run tools/companion.py validate <資料夾 | .companion 檔>
    uv run tools/companion.py pack <資料夾> [輸出的 .companion 檔]
    uv run tools/companion.py build <資料夾 | .companion 檔> <輸出資料夾>
    uv run tools/companion.py selftest [cases.json]

規則與原因的文字和 stygiomedusa app 匯入時相同 (`src-tauri/src/companion/`). app 的規則改變時, 要同步更新這裡與
`cases.json`; stygiomedusa 的 Rust 測試 (`tests/companion_tool_cases.rs`) 以同一份 `cases.json` 檢查 app.
selftest 也比對 skill 格式 reference 的契約區塊與這裡的常數; 同一個 Rust 測試檔以同一個區塊比對 app.
"""

from __future__ import annotations

import io
import json
import math
import sys
import zipfile
from pathlib import Path
from typing import Any

# --- 常數 (stygiomedusa `bubble::layout` 與 `companion`) ---

BEAD_RADIUS = 42.0
"""史萊姆珠子的半徑 (邏輯 px)."""
END_ROOM = 214.0
"""史萊姆視窗在鏈端預留的長度 (邏輯 px)."""
FORMAT = 1
RADIUS_RANGE = (16.0, 48.0)
LEAN_RANGE = (0.0, 1.0)
GEAR_RADIUS_RANGE = (16.0, 32.0)
"""`radius`, `lean`, `gear.radius` 允許的範圍 (含兩端)."""
MANIFEST_FILE = "companion.json"
LOTTIE_FILE = "companion.lottie"
ANIMATION_SOURCE = "animation.json"
STATE_MACHINE_SOURCE = "state-machine.json"
PACK_LIMIT = 10 * 1024 * 1024
UNPACKED_LIMIT = 20 * 1024 * 1024
GEAR_SLOT = "gear"
INPUTS = [
    ("edge", "String"),
    ("along", "String"),
    ("hovering", "Boolean"),
    ("dragging", "Boolean"),
    ("bud", "Numeric"),
    ("reducedMotion", "Boolean"),
]
RESERVED_IDS = {"con", "prn", "aux", "nul", *(f"com{i}" for i in range(1, 10)), *(f"lpt{i}" for i in range(1, 10))}
ID_CHARACTERS = set("abcdefghijklmnopqrstuvwxyz0123456789-")


class Rejected(Exception):
    """不通過; `reason` 每行一項原因."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def number_text(value: float | int) -> str:
    """數字的文字, 與 Rust 的 f64 `Display` 相同 (整數不帶小數點)."""
    value = float(value)
    if value.is_integer() and abs(value) < 1e16:
        return str(int(value))
    return repr(value)


def shown(value: float) -> float:
    """推導出的上下限取到小數兩位 (四捨五入, 與 Rust `f64::round` 相同)."""
    return math.copysign(math.floor(abs(value) * 100 + 0.5), value) / 100


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def at(value: Any, *keys: str | int) -> Any:
    """像 serde_json 的 `value[key]`: 不存在或型別不對時是 None."""
    for key in keys:
        if isinstance(key, int):
            value = value[key] if isinstance(value, list) and key < len(value) else None
        else:
            value = value.get(key) if isinstance(value, dict) else None
    return value


# --- manifest (`companion::manifest`) ---


class Fields:
    """讀取一層物件的欄位; 缺少或型別不對時記到 `errors`."""

    def __init__(self, obj: dict, path: str, errors: list[str]):
        self.obj, self.path, self.errors = obj, path, errors

    def get(self, key: str) -> Any:
        if key not in self.obj:
            self.errors.append(f"manifest 缺少 {self.path}{key}")
            return None
        return self.obj[key]

    def wrong(self, key: str, kind: str) -> None:
        self.errors.append(f"manifest 的 {self.path}{key} 必須是{kind}")

    def number(self, key: str) -> float:
        if key not in self.obj:
            self.get(key)
            return 0.0
        value = self.obj[key]
        if not is_number(value):
            self.wrong(key, "數字")
            return 0.0
        return float(value)

    def integer(self, key: str) -> int:
        if key not in self.obj:
            self.get(key)
            return 0
        value = self.obj[key]
        if not (isinstance(value, int) and not isinstance(value, bool) and value >= 0):
            self.wrong(key, "整數")
            return 0
        return value

    def text(self, key: str) -> str:
        if key not in self.obj:
            self.get(key)
            return ""
        value = self.obj[key]
        if not isinstance(value, str):
            self.wrong(key, "字串")
            return ""
        return value

    def object(self, key: str) -> dict | None:
        if key not in self.obj:
            self.get(key)
            return None
        value = self.obj[key]
        if not isinstance(value, dict):
            self.wrong(key, "物件")
            return None
        return value


JIGGLE_FIELDS = ["stiffness", "damping", "thin", "appear", "hide", "spit", "gulp"]


def parse_manifest(data: bytes) -> dict:
    """解析並檢查 manifest; 不通過時 raise `Rejected`, 原因的順序與 app 相同."""
    try:
        obj = json.loads(data)
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise Rejected(f"companion.json 不是有效的 JSON: {error}") from None
    if not isinstance(obj, dict):
        raise Rejected("companion.json 必須是 JSON 物件")
    errors: list[str] = []
    fields = Fields(obj, "", errors)
    manifest: dict[str, Any] = {
        "format": fields.integer("format"),
        "id": fields.text("id"),
        "name": fields.text("name"),
        "author": fields.text("author"),
        "radius": fields.number("radius"),
        "canvas": fields.number("canvas"),
        "gap": fields.number("gap"),
        "lean": fields.number("lean"),
        "gear": None,
    }
    if obj.get("gear") is not None:
        gear = fields.object("gear")
        if gear is not None:
            gear_fields = Fields(gear, "gear.", errors)
            manifest["gear"] = {"gap": gear_fields.number("gap"), "radius": gear_fields.number("radius")}
    jiggle = fields.object("jiggle")
    if jiggle is not None:
        jiggle_fields = Fields(jiggle, "jiggle.", errors)
        manifest["jiggle"] = {name: jiggle_fields.number(name) for name in JIGGLE_FIELDS}
    kicks = fields.object("kicks")
    if kicks is not None:
        kick_fields = Fields(kicks, "kicks.", errors)
        # app 以排序後的 map 保存 kicks.
        manifest["kicks"] = {state: kick_fields.number(state) for state in sorted(kicks)}
    if jiggle is None or kicks is None or errors:
        raise Rejected("\n".join(errors))
    errors = check_manifest(manifest)
    if errors:
        raise Rejected("\n".join(errors))
    return manifest


def check_manifest(m: dict) -> list[str]:
    errors: list[str] = []

    def within(field: str, value: float, low: float, high: float) -> None:
        if not low <= value <= high:
            errors.append(f"{field} 為 {number_text(value)}, 允許的範圍是 {number_text(low)} 到 {number_text(high)}")

    def at_least(field: str, value: float, low: float, why: str) -> None:
        if value < low:
            errors.append(f"{field} 為 {number_text(value)}, 允許的範圍是至少 {number_text(shown(low))} ({why})")

    def at_most(field: str, value: float, high: float, why: str) -> None:
        if value > high:
            errors.append(f"{field} 為 {number_text(value)}, 允許的範圍是最多 {number_text(shown(high))} ({why})")

    if m["format"] != FORMAT:
        errors.append(f"format 為 {m['format']}, 支援的版本是 {FORMAT}")
    check_id(m["id"], errors)
    if not m["name"].strip():
        errors.append("name 不能是空的")
    radius, canvas, gap, lean = m["radius"], m["canvas"], m["gap"], m["lean"]
    within("radius", radius, *RADIUS_RANGE)
    at_least("gap", gap, BEAD_RADIUS + radius, f"珠子半徑 {number_text(BEAD_RADIUS)} 加上 radius")
    at_least("canvas", canvas, radius, "radius")
    at_most("canvas", canvas, END_ROOM - gap, f"鏈端預留的 {number_text(END_ROOM)} 減去 gap")
    within("lean", lean, *LEAN_RANGE)
    gear = m["gear"]
    if gear is not None:
        within("gear.radius", gear["radius"], *GEAR_RADIUS_RANGE)
        at_least("gear.gap", gear["gap"], gap + radius + gear["radius"], "gap + radius + gear.radius")
        # 齒輪在畫布內: 夥伴中心比軌道往外一個珠子半徑, 齒輪出現時已往內探出 `lean × radius`.
        offset = max(BEAD_RADIUS - lean * radius, 0.0)
        at_most(
            "gear.gap",
            gear["gap"],
            gap + canvas - gear["radius"] - offset,
            f"gap + canvas - gear.radius - 齒輪出現時夥伴中心到軌道的 {number_text(shown(offset))}",
        )
    return errors


def check_id(id_: str, errors: list[str]) -> None:
    if not id_ or not set(id_) <= ID_CHARACTERS:
        errors.append(f"id 為 {id_}, 只能使用小寫英文字母, 數字與連字號")
    elif id_ == "none":
        errors.append("id 不能是 none (代表沒有夥伴)")
    elif id_ in RESERVED_IDS:
        errors.append(f"id 不能是 {id_} (Windows 保留的名稱)")


# --- 動畫 (`companion::animation`) ---


def read_entry(archive: zipfile.ZipFile, name: str) -> bytes:
    try:
        with archive.open(name) as entry:
            data = entry.read(UNPACKED_LIMIT + 1)
    except KeyError:
        raise Rejected(f"companion.lottie 缺少 {name}") from None
    except (zipfile.BadZipFile, OSError, RuntimeError) as error:
        raise Rejected(f"無法讀取 companion.lottie 的 {name}: {error}") from None
    if len(data) > UNPACKED_LIMIT:
        raise Rejected(f"companion.lottie 的 {name} 超過大小上限")
    return data


def read_json(archive: zipfile.ZipFile, name: str) -> Any:
    try:
        return json.loads(read_entry(archive, name))
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise Rejected(f"companion.lottie 的 {name} 不是有效的 JSON: {error}") from None


def check_lottie(manifest: dict, data: bytes) -> tuple[str, str]:
    """檢查 `.lottie`; 回傳要播放的動畫與 state machine 的 id."""
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise Rejected("companion.lottie 不是有效的 dotLottie (zip)") from None
    with archive:
        index = read_json(archive, "manifest.json")
        animation_id = at(index, "initial", "animation")
        if not isinstance(animation_id, str):
            animation_id = at(index, "animations", 0, "id")
        if not isinstance(animation_id, str):
            raise Rejected("companion.lottie 沒有動畫")
        machine_id = at(index, "initial", "stateMachine")
        if not isinstance(machine_id, str):
            machine_id = at(index, "stateMachines", 0, "id")
        if not isinstance(machine_id, str):
            raise Rejected("companion.lottie 沒有 state machine")
        animation = read_json(archive, f"a/{animation_id}.json")
        machine = read_json(archive, f"s/{machine_id}.json")

        errors: list[str] = []
        side = 2.0 * manifest["canvas"]
        width, height = at(animation, "w"), at(animation, "h")
        if not (is_number(width) and is_number(height) and float(width) == side and float(height) == side):
            show = lambda v: number_text(v) if is_number(v) else "?"  # noqa: E731
            errors.append(f"動畫的寬高為 {show(width)} x {show(height)}, 必須是 {number_text(side)} x {number_text(side)} (2 × canvas)")
        if manifest["gear"] is not None and not isinstance(at(animation, "slots", GEAR_SLOT, "p", "k"), list):
            errors.append(f"動畫缺少名為 {GEAR_SLOT} 的 vector slot (manifest 宣告了 gear)")
        declared = at(machine, "inputs") if isinstance(at(machine, "inputs"), list) else []
        for name, kind in INPUTS:
            found = next((item for item in declared if at(item, "name") == name), None)
            if found is None:
                errors.append(f"state machine 缺少 input {name} ({kind})")
            elif at(found, "type") != kind:
                shown_type = at(found, "type") if isinstance(at(found, "type"), str) else "?"
                errors.append(f"state machine 的 input {name} 是 {shown_type}, 必須是 {kind}")
        states = at(machine, "states") if isinstance(at(machine, "states"), list) else []
        for state in states:
            if not isinstance(at(state, "transitions"), list):
                state_name = at(state, "name") if isinstance(at(state, "name"), str) else "?"
                errors.append(f"state machine 的 state {state_name} 缺少 transitions (沒有轉換時寫空陣列)")
        for state in manifest["kicks"]:
            if not any(at(candidate, "name") == state for candidate in states):
                errors.append(f"kicks 的 state {state} 不存在於 state machine")
        if any(has_expression(read_json(archive, name)) for name in archive.namelist() if name.endswith(".json")):
            errors.append("動畫含有 expressions; 夥伴包不能含有 expressions")
    if errors:
        raise Rejected("\n".join(errors))
    return animation_id, machine_id


def has_expression(value: Any) -> bool:
    """Lottie 屬性的 `x` 是字串, 或 theme 規則的 `expression` 是字串."""
    if isinstance(value, dict):
        return (
            isinstance(value.get("x"), str)
            or isinstance(value.get("expression"), str)
            or any(has_expression(item) for item in value.values())
        )
    if isinstance(value, list):
        return any(has_expression(item) for item in value)
    return False


def validate_files(manifest_bytes: bytes, lottie: bytes) -> dict:
    manifest = parse_manifest(manifest_bytes)
    check_lottie(manifest, lottie)
    return manifest


# --- 資料夾與夥伴包檔 (`companion`, `companion::store`) ---


def zip_files(files: list[tuple[str, bytes]]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files:
            archive.writestr(name, data)
    return buffer.getvalue()


def build_lottie(id_: str, animation: bytes, state_machine: bytes) -> bytes:
    """dotLottie v2: `manifest.json`, `a/<id>.json`, `s/companion.json`."""
    index = {
        "version": "2",
        "generator": "stygiomedusa companion-pack",
        "animations": [{"id": id_}],
        "stateMachines": [{"id": "companion"}],
    }
    return zip_files(
        [
            ("manifest.json", json.dumps(index, separators=(",", ":")).encode()),
            (f"a/{id_}.json", animation),
            ("s/companion.json", state_machine),
        ]
    )


def read_dir(folder: Path) -> tuple[bytes, bytes]:
    """製作中的資料夾: `companion.json` 與 `companion.lottie`; 沒有 `.lottie` 時由 `animation.json` 與
    `state-machine.json` 組成 (動畫的 id 是夥伴包的 id, state machine 的 id 是 `companion`)."""

    def read(name: str) -> bytes:
        try:
            return (folder / name).read_bytes()
        except OSError:
            raise Rejected(f"{folder} 缺少 {name}") from None

    manifest = read(MANIFEST_FILE)
    if (folder / LOTTIE_FILE).exists():
        return manifest, read(LOTTIE_FILE)
    parsed = parse_manifest(manifest)
    return manifest, build_lottie(parsed["id"], read(ANIMATION_SOURCE), read(STATE_MACHINE_SOURCE))


def unpack(pack: bytes) -> tuple[bytes, bytes]:
    """取出夥伴包檔中的 manifest 與 `.lottie`; 與 app 匯入時的限制相同."""
    if len(pack) > PACK_LIMIT:
        raise Rejected("夥伴包超過 10 MB 的上限")
    try:
        archive = zipfile.ZipFile(io.BytesIO(pack))
    except zipfile.BadZipFile:
        raise Rejected("不是夥伴包: 檔案不是 zip") from None
    files: dict[str, bytes] = {}
    total = 0
    with archive:
        for info in archive.infolist():
            if info.filename not in (MANIFEST_FILE, LOTTIE_FILE):
                raise Rejected(f"夥伴包含有不支援的檔案: {info.filename} (只能有 {MANIFEST_FILE} 與 {LOTTIE_FILE})")
            try:
                with archive.open(info) as entry:
                    data = entry.read(UNPACKED_LIMIT + 1 - total)
            except (zipfile.BadZipFile, OSError, RuntimeError) as error:
                raise Rejected(f"無法讀取夥伴包的 {info.filename}: {error}") from None
            total += len(data)
            if total > UNPACKED_LIMIT:
                raise Rejected("夥伴包解開後超過 20 MB 的上限")
            files[info.filename] = data
    for name in (MANIFEST_FILE, LOTTIE_FILE):
        if name not in files:
            raise Rejected(f"不是夥伴包: 缺少 {name}")
    return files[MANIFEST_FILE], files[LOTTIE_FILE]


def read_source(source: Path) -> tuple[bytes, bytes]:
    """資料夾或 `.companion` 檔."""
    if source.is_dir():
        return read_dir(source)
    try:
        pack = source.read_bytes()
    except OSError:
        raise Rejected(f"找不到 {source}") from None
    return unpack(pack)


# --- 指令 ---

USAGE = """用法:
  uv run tools/companion.py validate <資料夾 | .companion 檔>
  uv run tools/companion.py pack <資料夾> [輸出的 .companion 檔]
  uv run tools/companion.py build <資料夾 | .companion 檔> <輸出資料夾>
  uv run tools/companion.py selftest [cases.json]"""


def command_validate(source: Path) -> str:
    manifest = validate_files(*read_source(source))
    return f"通過: {manifest['name']} ({manifest['id']})"


def command_pack(folder: Path, out: Path | None) -> str:
    manifest_bytes, lottie = read_dir(folder)
    manifest = validate_files(manifest_bytes, lottie)
    target = out or Path(f"{manifest['id']}.companion")
    pack = zip_files([(MANIFEST_FILE, manifest_bytes), (LOTTIE_FILE, lottie)])
    try:
        target.write_bytes(pack)
    except OSError as error:
        raise Rejected(f"無法寫入 {target}: {error}") from None
    return f"已產生 {target} ({manifest['name']} {manifest['id']})"


def command_build(source: Path, out: Path) -> str:
    """預覽用: 寫出 app 安裝後的兩個檔案; 只要求 manifest 通過, 動畫的問題由 validate 指出."""
    manifest_bytes, lottie = read_source(source)
    manifest = parse_manifest(manifest_bytes)
    out.mkdir(parents=True, exist_ok=True)
    (out / MANIFEST_FILE).write_bytes(manifest_bytes)
    (out / LOTTIE_FILE).write_bytes(lottie)
    return f"已寫出 {out / MANIFEST_FILE} 與 {out / LOTTIE_FILE} ({manifest['name']} {manifest['id']})"


def merge_patch(target: Any, patch: Any) -> Any:
    """RFC 7386 JSON merge patch: 物件逐鍵合併, null 刪除, 其他值 (包含陣列) 整個取代."""
    if not isinstance(patch, dict):
        return patch
    result = dict(target) if isinstance(target, dict) else {}
    for key, value in patch.items():
        if value is None:
            result.pop(key, None)
        else:
            result[key] = merge_patch(result.get(key), value)
    return result


def command_selftest(cases_path: Path) -> str:
    """以 `cases.json` 檢查這裡的規則; stygiomedusa 的 Rust 測試以同一份檔案檢查 app."""
    cases = json.loads(cases_path.read_text(encoding="utf-8"))
    base = cases["base"]
    failures: list[str] = []
    for case in cases["cases"]:
        parts = {key: merge_patch(base[key], case.get(key, {})) for key in ("manifest", "animation", "stateMachine")}
        manifest = json.dumps(parts["manifest"], ensure_ascii=False).encode()
        id_ = base["manifest"]["id"]
        lottie = build_lottie(id_, json.dumps(parts["animation"]).encode(), json.dumps(parts["stateMachine"]).encode())
        try:
            validate_files(manifest, lottie)
            actual: list[str] = []
        except Rejected as rejected:
            actual = rejected.reason.split("\n")
        if actual != case["errors"]:
            failures.append(f"- {case['name']}\n  預期: {case['errors']}\n  實際: {actual}")
    # 範本: 資料夾通過驗證, 打包後的夥伴包也通過匯入的檢查.
    template = Path(__file__).resolve().parent.parent / "mochi"
    try:
        manifest_bytes, lottie = read_dir(template)
        validate_files(*unpack(zip_files([(MANIFEST_FILE, manifest_bytes), (LOTTIE_FILE, lottie)])))
    except Rejected as rejected:
        failures.append(f"- 範本 {template}\n  {rejected.reason}")
    contracts = check_skill_contracts(failures)
    if failures:
        raise Rejected("selftest 失敗:\n" + "\n".join(failures))
    return (
        f"selftest 通過: {len(cases['cases'])} 個案例, 範本與 {contracts} 份 skill 契約"
        f" (Stygiomedusa {kit_version()} 的規則)"
    )


SKILL_DIRS = ["skills", ".claude/skills", ".agents/skills"]
"""skill 的位置: stygiomedusa 中在 `skills/`, 發布到 stygiomedusa-companions 後在另外兩個."""
CONTRACT_FILE = "stygio-companion/references/format.md"
CONTRACT_BEGIN = "<!-- contract:begin -->"
CONTRACT_END = "<!-- contract:end -->"


def contract() -> dict:
    """skill 格式 reference 的契約區塊應有的內容: 這裡的驗證規則使用的常數與 input."""
    return {
        "BEAD_RADIUS": BEAD_RADIUS,
        "END_ROOM": END_ROOM,
        "radius": list(RADIUS_RANGE),
        "lean": list(LEAN_RANGE),
        "gear.radius": list(GEAR_RADIUS_RANGE),
        "PACK_LIMIT": PACK_LIMIT,
        "UNPACKED_LIMIT": UNPACKED_LIMIT,
        "inputs": [list(pair) for pair in INPUTS],
    }


def contract_block(text: str) -> dict:
    """`CONTRACT_BEGIN` 與 `CONTRACT_END` 之間的 ```json 區塊."""
    begin = text.find(CONTRACT_BEGIN)
    end = text.find(CONTRACT_END, begin)
    if begin < 0 or end < 0:
        raise ValueError(f"找不到 {CONTRACT_BEGIN} 與 {CONTRACT_END}")
    block = text[begin:end]
    start = block.find("```json")
    stop = block.find("```", start + 7)
    if start < 0 or stop < 0:
        raise ValueError("契約區塊中沒有完整的 ```json 區塊")
    value = json.loads(block[start + 7 : stop])
    if not isinstance(value, dict):
        raise ValueError("契約區塊不是 JSON 物件")
    return value


def check_skill_contracts(failures: list[str]) -> int:
    """比對每一份找到的 skill 契約區塊; 回傳比對的份數. 一份都沒有時也是失敗."""
    root = Path(__file__).resolve().parent.parent
    paths = [f"{folder}/{CONTRACT_FILE}" for folder in SKILL_DIRS]
    found = [path for path in paths if (root / path).is_file()]
    if not found:
        failures.append("- 找不到 skill 的格式 reference, 找過:\n" + "\n".join(f"  {path}" for path in paths))
        return 0
    def text(value: Any) -> str:
        return "(沒有)" if value is None else json.dumps(value, ensure_ascii=False)

    expected = contract()
    for path in found:
        try:
            actual = contract_block((root / path).read_text(encoding="utf-8"))
        except ValueError as error:
            failures.append(f"- {path}\n  {error}")
            continue
        for key in sorted(expected.keys() | actual.keys()):
            if expected.get(key) != actual.get(key):
                failures.append(
                    f"- {path} 的契約區塊與驗證規則不同: {key} 應為 {text(expected.get(key))},"
                    f" 區塊為 {text(actual.get(key))}"
                )
    return len(found)


def kit_version() -> str:
    """工具包 `package.json` 的 `version`: 規則與這個版本的 stygiomedusa 相同."""
    package = Path(__file__).resolve().parent.parent / "package.json"
    return json.loads(package.read_text(encoding="utf-8"))["version"]


def main(args: list[str]) -> int:
    try:
        match args:
            case ["validate", source]:
                output = command_validate(Path(source))
            case ["pack", folder]:
                output = command_pack(Path(folder), None)
            case ["pack", folder, out]:
                output = command_pack(Path(folder), Path(out))
            case ["build", source, out]:
                output = command_build(Path(source), Path(out))
            case ["selftest"]:
                output = command_selftest(Path(__file__).resolve().parent / "cases.json")
            case ["selftest", cases_path]:
                output = command_selftest(Path(cases_path))
            case _:
                print(USAGE, file=sys.stderr)
                return 2
    except Rejected as rejected:
        print(f"不通過:\n{rejected.reason}", file=sys.stderr)
        return 1
    print(output)
    return 0


if __name__ == "__main__":
    # Windows 的主控台預設不是 UTF-8.
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
