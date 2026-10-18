// 夥伴K的夥伴包 (stygiomedusa companion-pack tasks 8.1): 搬入私人 build 原本 (CompanionK.vue, companionK.ts) 的公式,
// 以 60 fps 逐 frame 烘焙成線性 keyframe, 動作與時間和原本一樣. 公式在 companionk-core/core.mjs, 與各能力共用;
// 夥伴K沒有帽子與武器, 出場與退場用核心預設的星星 (坐著星星飛進來, 跳上星星飛走).
// 產物寫到 ./companion/, 再於 repo 的根目錄以
// `npm run pack -- companionk/companion companionk/companionk.companion` 打包.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../companionk-core/core.mjs';

build({ id: 'companionk', name: '夥伴K' }, join(dirname(fileURLToPath(import.meta.url)), 'companion'));
