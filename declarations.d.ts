declare module 'react-native-perspective-image-cropper' {
  import { Component } from 'react';

  export interface Point {
    x: number;
    y: number;
  }

  export interface Rectangle {
    topLeft: Point;
    topRight: Point;
    bottomLeft: Point;
    bottomRight: Point;
  }

  export interface CustomCropProps {
    updateImage: (image: string, coordinates: Rectangle) => void;
    rectangleCoordinates?: Rectangle;
    initialImage: string;
    height: number;
    width: number;
    overlayColor?: string;
    overlayStrokeColor?: string;
    handlerColor?: string;
    overlayStrokeWidth?: number;
    overlayOpacity?: number;
  }

  export default class CustomCrop extends Component<CustomCropProps> {
    crop(): void;
  }
}
declare module '@env' {
  export const GOOGLE_CLOUD_KEY: string;
  export const BASE_URL: string;
  export const SPINE_API_BASE_URL: string;
  export const APP_STORE_ID: string;
  export const ANDROID_PACKAGE_NAME: string;
}

