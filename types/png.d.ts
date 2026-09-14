declare module '*.png' {
  const content: {
    src: string;
    width: number;
    height: number;
  };
  export default content;
}
