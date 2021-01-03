export function catchError(f: Function, ...args: any[]) {
   try {
      f(...args);
   } catch (error) {
      console.log(error);
      alert("Error: " + error);
   }
}

var gaussianNoiseSpare: number | undefined;

export function getGaussianNoise() : number {
   if (gaussianNoiseSpare !== undefined) {
      const temp = gaussianNoiseSpare;
      gaussianNoiseSpare = undefined;
      return temp;
   }
   while (true) {
      const u = Math.random() * 2 - 1;
      const v = Math.random() * 2 - 1;
      const q = u * u + v * v;
      if (q > 0 && q < 1) {
         const p = Math.sqrt(-2 * Math.log(q) / q);
         gaussianNoiseSpare = u * p;
         return v * p;
      }
   }
}
