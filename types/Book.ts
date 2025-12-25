export interface Book {
  id: string;
  googleId: string;
  title: string;
  author: string;
  thickness: number; // in cm
  height: number; // in cm
  width: number; // in cm
  smallThumbnail: string;
  ISBN10?: string;
  ISBN13?: string;
  spineThumbnail?: string;
  spineUploaded?: boolean;
}

export const SHELF_HEIGHT_CM = 40; // cm

// Sample books for testing
export const sampleBooks: Book[] = [
  {
    id: '1',
    googleId: 'IfNqvQXbuk8C',
    title: 'Existentialism is a Humanism',
    author: 'Jean-Paul Sartre',
    height: 20.0,
    width: 12.7,
    thickness: 1.0,
    ISBN10: '0300115466',
    ISBN13: '9780300115468',
    smallThumbnail:
      'http://books.google.com/books/content?id=IfNqvQXbuk8C&printsec=frontcover&img=1&zoom=5&imgtk=AFLRE70K0hNNDT4j8hpZbwfEff7aPbqId1hqoihsRTT6R9F-VCuVSR2rI8YNJIH6_b_CaisOPuTytp8Ec7mAON5VOU7T8qn61Wgg_sXxkclLzvdQTK5hr19knJdRq3AmZ9hgC8WH3AhV&source=gbs_api',
  },
  {
    id: '2',
    googleId: 'sYmMEAAAQBAJ',
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    height: 18.0,
    width: 11.3,
    thickness: 3.7,
    ISBN10: '0141192801',
    ISBN13: '9780141192802',
    smallThumbnail:
      'http://books.google.com/books/publisher/content?id=sYmMEAAAQBAJ&printsec=frontcover&img=1&zoom=5&imgtk=AFLRE735Y_CDEmsS6AD_mtu2mPnD3q4_YFPbZwAHMcy0TjDPujLB2kEYY9y0Wf1iZIxiRRk6FeZRKpSwM_xgPSczjCyEO-jnfp1JLqc9Q2pQDvqFEsU0cC5l0sg_IF2jqfDZvqVBIOPf&source=gbs_api',
  },
  {
    id: '3',
    googleId: 'UPNtswEACAAJ',
    title: 'Life 3.0',
    author: 'Max Tegmark',
    height: 20.0,
    width: 12.9,
    thickness: 3.1,
    ISBN10: '0141981806',
    ISBN13: '9780141981802',
    smallThumbnail:
      'http://books.google.com/books/content?id=UPNtswEACAAJ&printsec=frontcover&img=1&zoom=5&imgtk=AFLRE72vXJ-3i0-BqH4kxClMZ2Eyx4BYe88-pubgD4d7-eUjkFjMHhcgWO3mEzUx8ROzaohGbKC_uRiNiXdxUtDMA4CmjxAFXSjP28zk2DBiXdbntmZ-hX9FRAK-n8o3QrptAB3113Gc&source=gbs_api',
  },
];
