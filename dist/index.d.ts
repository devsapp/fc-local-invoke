import { InputProps } from './common/entity';
export default class FcLocalInvokeComponent {
    report(componentName: string, command: string, accountID?: string, access?: string): Promise<void>;
    startExpress(targetApp: any, serverPort: number): void;
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
