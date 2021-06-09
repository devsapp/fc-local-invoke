"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const tty_table_1 = __importDefault(require("tty-table"));
const lodash_get_1 = __importDefault(require("lodash.get"));
class BaseComponent {
    constructor(inputs) {
        this.inputs = inputs;
        const libBasePath = this.__getBasePath();
        const pkgPath = path_1.default.join(libBasePath, '..', 'package.json');
        if (pkgPath) {
            const pkg = JSON.parse(fs_1.default.readFileSync(path_1.default.join(pkgPath), 'utf8'));
            this.name = pkg.name;
        }
    }
    __getBasePath() {
        if (this.basePath) {
            return this.basePath;
        }
        const baseName = path_1.default.basename(__dirname);
        if (baseName !== 'lib') {
            this.basePath = path_1.default.join(__dirname, '..');
        }
        else {
            this.basePath = __dirname;
        }
        return this.basePath;
    }
    __doc(projectName) {
        const libBasePath = this.__getBasePath();
        const docPath = path_1.default.join(libBasePath, '..', 'doc', 'doc.json');
        if (fs_1.default.existsSync(docPath)) {
            const fileContent = fs_1.default.readFileSync(docPath).toString();
            const result = JSON.parse(fileContent);
            const options = {
                borderStyle: "solid",
                borderColor: "blue",
                headerAlign: "center",
                align: "left",
                color: "cyan",
                width: "100%"
            };
            const header = [{
                    value: "方法",
                    headerColor: "cyan",
                    color: "cyan",
                    align: "left",
                    width: "auto",
                    formatter: function (value) {
                        return value;
                    }
                }, {
                    value: "方法说明",
                    headerColor: "cyan",
                    color: "cyan",
                    align: "left",
                    width: "auto",
                    formatter: function (value) {
                        return value;
                    }
                }, {
                    value: "入参示例",
                    headerColor: "cyan",
                    color: "cyan",
                    align: "left",
                    width: 'auto',
                    formatter: function (value) {
                        return value;
                    }
                }, {
                    value: "命令行调用示例",
                    headerColor: "cyan",
                    color: "cyan",
                    align: "left",
                    width: 'auto',
                    formatter: function (value) {
                        return value;
                    }
                }];
            const rows = [];
            const data = lodash_get_1.default(result, 'children[0].children', []).filter((item) => item.kindString === 'Method' && lodash_get_1.default(item, 'flags.isPublic'));
            let cliStr = projectName ? `s ${projectName}` : `s cli ${this.name}`; // 独立组件执行使用cli
            data.forEach((item) => {
                const params = lodash_get_1.default(item, 'signatures[0].parameters[0]', {});
                const paramText = lodash_get_1.default(params, 'comment.text', '');
                rows.push([item.name, lodash_get_1.default(item, 'signatures[0].comment.shortText', ''), paramText, `${cliStr} ${item.name}`]);
            });
            return tty_table_1.default(header, rows, options).render();
        }
        else {
            return 'not found doc content';
        }
    }
}
exports.default = BaseComponent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tb24vYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsMERBQThCO0FBQzlCLDREQUE2QjtBQUU3QixNQUFxQixhQUFhO0lBSzlCLFlBQXNCLE1BQVc7UUFBWCxXQUFNLEdBQU4sTUFBTSxDQUFLO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN6QyxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDN0QsSUFBSSxPQUFPLEVBQUU7WUFDVCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztTQUN4QjtJQUNMLENBQUM7SUFFRCxhQUFhO1FBQ1QsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO1NBQ3hCO1FBQ0QsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQyxJQUFJLFFBQVEsS0FBSyxLQUFLLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUM5QzthQUFNO1lBQ0gsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUM7U0FDN0I7UUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFvQjtRQUN0QixNQUFN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