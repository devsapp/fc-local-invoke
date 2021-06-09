import { CustomDomainConfig } from '../interface/fc-custom-domain';
import * as _ from 'lodash';
import logger from '../../common/logger';

export function showTipsWithDomainIfNecessary(customDomainConfigList: CustomDomainConfig[], domainName?: string): void {
  if (!domainName && !_.isEmpty(customDomainConfigList)) {
    showLocalStartNextTips(customDomainConfigList);
  }
}

function showLocalStartNextTips(customDomainConfigList: CustomDomainConfig[]) {

  const startCommand = customDomainConfigList.map(cur => `s start ${cur.domainName}`);
  const debugCommand = customDomainConfigList.map(cur => `s start -d 3000 ${cur.domainName}`);

  const startTip = `${startCommand.join('\n* ')}`;
  const debugTip = `${debugCommand.join('\n* ')}`;

  logger.log(`\nTips：you can also use these commands to run/debug custom domain resources:\n
Start with customDomain: \n* ${startTip}

Debug with customDomain: \n* ${debugTip}\n`, 'yellow');
}
