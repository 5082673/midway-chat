import { Rule, RuleType } from '@midwayjs/validate';
const requiredString = RuleType.string().required();

export class headerDTO {
    @Rule(requiredString.error(new Error('user_id 不能为空')))
    user_id: string;
}
