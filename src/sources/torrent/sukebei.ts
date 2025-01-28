import getWrapper from './getWrapper.ts';
import { get } from './nyaa.ts';

const BASE_URL = "sukebei.nyaa.si";

export default getWrapper((id) => get(id, BASE_URL));
