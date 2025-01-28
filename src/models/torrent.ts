class Torrent {
  constructor(
    public title: string,
    public link: string,
    public fileList: Array<string> = [],
    public description?: string,
    public category?: string
  ) {}
}

export default Torrent;
