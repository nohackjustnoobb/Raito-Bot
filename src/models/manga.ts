import { FmtString } from 'telegraf/format';

class Manga {
  title: { en?: string | FmtString; jp?: string | FmtString };
  cover?: string;
  artists: Array<string>;
  tags: Array<string>;
  urls: Array<string>;
  language?: string;

  constructor(
    title: { en?: string | FmtString; jp?: string | FmtString } = {},
    cover?: string,
    artists: Array<string> = [],
    tags: Array<string> = [],
    language?: string,
    urls: Array<string> = []
  ) {
    this.title = title;
    this.cover = cover;
    this.artists = artists;
    this.tags = tags;
    this.language = language;
    this.urls = urls;
  }
}

export default Manga;
