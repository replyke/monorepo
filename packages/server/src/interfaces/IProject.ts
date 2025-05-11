import { IProjectKeys } from "./IProjectKeys";
import { IProjectWebhooks } from "./IProjectWebhooks";

export default interface IProject {
  id: string;
  name: string;
  keys: IProjectKeys; // TODO: Change to array of more flexible key object?
  webhooks: IProjectWebhooks;
}
