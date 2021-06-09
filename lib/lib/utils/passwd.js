"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePwdFile = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const passwdContent = `
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-timesync:x:100:103:systemd Time Synchronization,,,:/run/systemd:/bin/false
systemd-network:x:101:104:systemd Network Management,,,:/run/systemd/netif:/bin/false
systemd-resolve:x:102:105:systemd Resolver,,,:/run/systemd/resolve:/bin/false
systemd-bus-proxy:x:103:106:systemd Bus Proxy,,,:/run/systemd:/bin/false
messagebus:x:104:108::/var/run/dbus:/bin/false
`;
function generatePwdFile(uid, gid) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!uid) {
            uid = process.getuid();
        }
        if (!gid) {
            gid = process.getgid();
        }
        const filePath = path.join('/', 'tmp', `fc_${uid}_${gid}_passwd`);
        if (!(yield fs.pathExists(filePath))) {
            const content = passwdContent + `fc:x:${uid}:${gid}::/tmp:/usr/sbin/nologin`;
            yield fs.writeFile(filePath, content);
        }
        return filePath;
    });
}
exports.generatePwdFile = generatePwdFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFzc3dkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi91dGlscy9wYXNzd2QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qiw2Q0FBK0I7QUFFL0IsTUFBTSxhQUFhLEdBQVc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXdCN0IsQ0FBQztBQUVGLFNBQXNCLGVBQWUsQ0FBQyxHQUFZLEVBQUUsR0FBWTs7UUFDOUQsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7U0FBRTtRQUNyQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQUUsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUFFO1FBRXJDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEdBQUcsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1FBRWxFLElBQUksQ0FBQyxDQUFBLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQSxFQUFFO1lBQ2xDLE1BQU0sT0FBTyxHQUFHLGFBQWEsR0FBRyxRQUFRLEdBQUcsSUFBSSxHQUFHLDBCQUEwQixDQUFDO1lBQzdFLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDdkM7UUFFRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0NBQUE7QUFaRCwwQ0FZQyJ9