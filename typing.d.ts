declare global {
  interface Window {
    setScore?: (score:number) => void;
  }
}
export {};
