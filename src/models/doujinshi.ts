import { FmtString } from 'telegraf/format';

class Doujinshi {
  constructor(
    public title: { en?: string | FmtString; jp?: string | FmtString } = {},
    public cover?: string,
    public artists: Array<string> = [],
    public tags: Array<string> = [],
    public language?: string,
    public urls: Array<string> = [],
    public type?: string,
    public parodies?: string
  ) {}
}

export default Doujinshi;
