import BaseComponent from './common/base';
import { InputProps } from './common/entity';
export default class FcLocalInvokeComponent extends BaseComponent {
    constructor(props: any);
    report(componentName: string, command: string, accountID?: string, access?: string): Promise<void>;
    startExpress(app: any): void;
    handlerInputs(inputs: InputProps): Promise<any>;
    /**
     * http 函数本地调试
     * @param inputs
     * @returns
     */
    start(inputs: InputProps): Promise<any>;
    /**
     * event 函数本地调试
     * @param inputs
     * @returns
     */
    invoke(inputs: InputProps): Promise<any>;
    help(): Promise<void>;
}
