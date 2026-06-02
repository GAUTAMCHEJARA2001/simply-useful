declare module '@react-pdf/renderer' {
  import * as React from 'react';

  export const Document: React.FC<any>;
  export const Page: React.FC<any>;
  export const Text: React.FC<any>;
  export const View: React.FC<any>;
  export const Image: React.FC<any>;

  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
  };

  export const pdf: (
    document?: React.ReactElement | null
  ) => {
    toBlob: () => Promise<Blob>;
  };
}
