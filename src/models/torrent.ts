class Torrent {
  constructor(
    public title: string,
    public link: string,
    public fileList: Array<string> = [],
    public description?: string,
    public category?: string,
    public progress?: number,
    public hash?: string
  ) {}
}

export default Torrent;
