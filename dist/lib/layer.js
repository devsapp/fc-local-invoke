"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLayer = exports.genLayerCodeCachePath = exports.supportLayer = void 0;
const core = __importStar(require("@serverless-devs/core"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../common/logger"));
const { fse, loadComponent, unzip } = core;
const supportLayer = (runtime) => {
    return runtime.startsWith('nodejs') || runtime.startsWith('python');
};
exports.supportLayer = supportLayer;
const genLayerCodeCachePath = (baseDir, serviceName, functionName) => path_1.default.join(baseDir, '.s', 'opt', serviceName, functionName);
exports.genLayerCodeCachePath = genLayerCodeCachePath;
function loadLayer({ credentials, region, layers, baseDir, runtime, serviceName, functionName, }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, exports.supportLayer)(runtime) || lodash_1.default.isEmpty(layers)) {
            logger_1.default.debug('Skip load layer');
            return;
        }
        const loadLayerVM = core.spinner('load layer...');
        try {
            const layerCodeCachePath = (0, exports.genLayerCodeCachePath)(baseDir, serviceName, functionName);
            const cacheLayerListFilePath = path_1.default.join(layerCodeCachePath, '.cache-layer-list');
            try {
                const cacheLayerList = JSON.parse(fse.readFileSync(cacheLayerListFilePath, 'utf-8'));
                if (lodash_1.default.isEqual(cacheLayerList, cacheLayerList)) {
                    logger_1.default.debug('Has cache, skip load layer');
                    loadLayerVM.stop();
                    return;
                }
            }
            catch (_ex) { /**/ }
            yield downloadLayer(layerCodeCachePath, layers, credentials, region);
            yield fse.writeFile(cacheLayerListFilePath, JSON.stringify(layers));
            loadLayerVM.stop();
        }
        catch (ex) {
            loadLayerVM.fail();
            throw ex;
        }
    });
}
exports.loadLayer = loadLayer;
function downloadLayer(layerCodeCachePath, layers, credentials, region) {
    return __awaiter(this, void 0, void 0, function* () {
        fse.emptyDirSync(layerCodeCachePath);
        const fcLayer = yield loadComponent('devsapp/fc-layer');
        const filters = [];
        for (const layerArn of layers) {
            const [, layerName, version] = layerArn.split('#');
            const inputs = {
                credentials,
                props: { region, layerName, version }
            };
            const cachePath = yield fcLayer.download(inputs);
            yield unzip(cachePath, layerCodeCachePath, {
                filter: file => {
                    if (filters.includes(file.path)) {
                        return false;
                    }
                    filters.push(file.path);
                    return true;
                },
            });
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL2xheWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNERBQThDO0FBQzlDLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsOERBQXNDO0FBRXRDLE1BQU0sRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztBQUVwQyxNQUFNLFlBQVksR0FBRyxDQUFDLE9BQWUsRUFBRSxFQUFFO0lBQzlDLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQTtBQUZZLFFBQUEsWUFBWSxnQkFFeEI7QUFFTSxNQUFNLHFCQUFxQixHQUFHLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUMxRSxjQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztBQURoRCxRQUFBLHFCQUFxQix5QkFDMkI7QUFFN0QsU0FBc0IsU0FBUyxDQUFDLEVBQzlCLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQzdDLFdBQVcsRUFBRSxZQUFZLEdBQzFCOztRQUNDLElBQUksQ0FBQyxJQUFBLG9CQUFZLEVBQUMsT0FBTyxDQUFDLElBQUksZ0JBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0MsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNoQyxPQUFPO1NBQ1I7UUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2xELElBQUk7WUFDRixNQUFNLGtCQUFrQixHQUFHLElBQUEsNkJBQXFCLEVBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNyRixNQUFNLHNCQUFzQixHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUNsRixJQUFJO2dCQUNGLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNyRixJQUFJLGdCQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsRUFBRTtvQkFDN0MsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztvQkFDM0MsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNuQixPQUFPO2lCQUNSO2FBQ0Y7WUFBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRTtZQUV0QixNQUFNLGFBQWEsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JFLE1BQU0sR0FBRyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDcEUsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3BCO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkIsTUFBTSxFQUFFLENBQUM7U0FDVjtJQUNILENBQUM7Q0FBQTtBQTVCRCw4QkE0QkM7QUFFRCxTQUFlLGFBQWEsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU07O1FBQzFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxNQUFNLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNuQixLQUFLLE1BQU0sUUFBUSxJQUFJLE1BQU0sRUFBRTtZQUM3QixNQUFNLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuRCxNQUFNLE1BQU0sR0FBRztnQkFDYixXQUFXO2dCQUNYLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFO2FBQ3RDLENBQUM7WUFDRixNQUFNLFNBQVMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakQsTUFBTSxLQUFLLENBQUMsU0FBUyxFQUFFLGtCQUFrQixFQUFFO2dCQUN6QyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQ2IsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDL0IsT0FBTyxLQUFLLENBQUM7cUJBQ2Q7b0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3hCLE9BQU8sSUFBSSxDQUFDO2dCQUNkLENBQUM7YUFDRixDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FBQSJ9