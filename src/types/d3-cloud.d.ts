declare module 'd3-cloud' {
  export interface D3Word {
    text: string;
    size: number;
    rotate?: number;
    x?: number;
    y?: number;
    [key: string]: any;
  }

  export interface D3CloudLayout {
    size(size: [number, number]): D3CloudLayout;
    words(words: D3Word[]): D3CloudLayout;
    padding(padding: number | ((d: D3Word) => number)): D3CloudLayout;
    rotate(angle: number | ((d: D3Word) => number)): D3CloudLayout;
    font(font: string | ((d: D3Word) => string)): D3CloudLayout;
    fontWeight(weight: number | string | ((d: D3Word) => number | string)): D3CloudLayout;
    fontSize(size: number | ((d: D3Word) => number)): D3CloudLayout;
    spiral(type: 'archimedean' | 'rectangular'): D3CloudLayout;
    on(event: 'word' | 'end', callback: (words: D3Word[], bounds?: [[number, number], [number, number]]) => void): D3CloudLayout;
    start(): D3CloudLayout;
    stop(): D3CloudLayout;
  }

  export default function cloud(): D3CloudLayout;
}

