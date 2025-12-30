
import React, { Component } from 'react';
import {
    NativeModules,
    PanResponder,
    Dimensions,
    Image,
    View,
    Animated,
    Platform,
    StyleSheet,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

class CustomCrop extends Component {
    constructor(props) {
        super(props);
        const viewWidth = SCREEN_WIDTH;
        const viewHeight = viewWidth * (props.height / props.width);

        const initialCoords = {
            topLeft: props.rectangleCoordinates
                ? this.imageCoordinatesToViewCoordinates(props.rectangleCoordinates.topLeft, viewWidth, viewHeight, props.width, props.height)
                : { x: 100, y: 100 },
            topRight: props.rectangleCoordinates
                ? this.imageCoordinatesToViewCoordinates(props.rectangleCoordinates.topRight, viewWidth, viewHeight, props.width, props.height)
                : { x: viewWidth - 100, y: 100 },
            bottomLeft: props.rectangleCoordinates
                ? this.imageCoordinatesToViewCoordinates(props.rectangleCoordinates.bottomLeft, viewWidth, viewHeight, props.width, props.height)
                : { x: 100, y: viewHeight - 100 },
            bottomRight: props.rectangleCoordinates
                ? this.imageCoordinatesToViewCoordinates(props.rectangleCoordinates.bottomRight, viewWidth, viewHeight, props.width, props.height)
                : { x: viewWidth - 100, y: viewHeight - 100 },
        };

        this.state = {
            viewHeight,
            viewWidth,
            height: props.height,
            width: props.width,
            image: props.initialImage,
            moving: false,
            activeCorner: null,
            topLeft: new Animated.ValueXY(initialCoords.topLeft),
            topRight: new Animated.ValueXY(initialCoords.topRight),
            bottomLeft: new Animated.ValueXY(initialCoords.bottomLeft),
            bottomRight: new Animated.ValueXY(initialCoords.bottomRight),
            overlayPositions: '',
        };

        this.cornerValues = initialCoords;
        this.state.overlayPositions = this.getOverlayString();

        this.setupListeners();

        this.panResponderTopLeft = this.createPanResponser(this.state.topLeft, 'topLeft');
        this.panResponderTopRight = this.createPanResponser(this.state.topRight, 'topRight');
        this.panResponderBottomLeft = this.createPanResponser(this.state.bottomLeft, 'bottomLeft');
        this.panResponderBottomRight = this.createPanResponser(this.state.bottomRight, 'bottomRight');
    }

    setupListeners() {
        const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
        corners.forEach(corner => {
            this.state[corner].addListener((value) => {
                this.cornerValues[corner] = value;
                this.updateOverlayString();
            });
        });
    }

    componentWillUnmount() {
        const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
        corners.forEach(corner => {
            this.state[corner].removeAllListeners();
        });
    }

    getOverlayString() {
        const { topLeft, topRight, bottomRight, bottomLeft } = this.cornerValues;
        return `${topLeft.x},${topLeft.y} ${topRight.x},${topRight.y} ${bottomRight.x},${bottomRight.y} ${bottomLeft.x},${bottomLeft.y}`;
    }

    createPanResponser(corner, name) {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: Animated.event([
                null,
                {
                    dx: corner.x,
                    dy: corner.y,
                },
            ], { 
                useNativeDriver: false,
            }),
            onPanResponderRelease: () => {
                corner.flattenOffset();
                this.setState({ activeCorner: null });
            },
            onPanResponderGrant: () => {
                const { x, y } = this.cornerValues[name];
                corner.setOffset({ x, y });
                corner.setValue({ x: 0, y: 0 });
                this.setState({ activeCorner: name });
            },
        });
    }

    crop() {
        const { topLeft, topRight, bottomLeft, bottomRight } = this.cornerValues;
        const coordinates = {
            topLeft: this.coordsToImageCoordinates(topLeft),
            topRight: this.coordsToImageCoordinates(topRight),
            bottomLeft: this.coordsToImageCoordinates(bottomLeft),
            bottomRight: this.coordsToImageCoordinates(bottomRight),
            height: this.state.height,
            width: this.state.width,
        };
        NativeModules.CustomCropManager.crop(
            coordinates,
            this.state.image,
            (err, res) => {
                if (res && res.image) {
                    this.props.updateImage(res.image, coordinates);
                }
            },
        );
    }

    updateOverlayString() {
        this.setState({
            overlayPositions: this.getOverlayString(),
        });
    }

    imageCoordinatesToViewCoordinates(corner, viewWidth, viewHeight, width, height) {
        return {
            x: (corner.x * viewWidth) / width,
            y: (corner.y * viewHeight) / height,
        };
    }

    coordsToImageCoordinates(corner) {
        return {
            x: (corner.x / this.state.viewWidth) * this.state.width,
            y: (corner.y / this.state.viewHeight) * this.state.height
        };
    };

    renderMagnifier() {
        const { activeCorner, image, viewWidth, viewHeight } = this.state;
        if (!activeCorner) return null;

        const { x, y } = this.cornerValues[activeCorner];

        const magnifierSize = 120;
        const zoom = 2.5;

        // Calculate the position of the image within the magnifier
        const imageLeft = -(x * zoom - magnifierSize / 2);
        const imageTop = -(y * zoom - magnifierSize / 2);

        return (
            <View style={[styles.magnifierContainer, { top: 20, left: 20 }]}>
                <View style={styles.magnifierWindow}>
                    <Image
                        source={{ uri: image }}
                        style={{
                            width: viewWidth * zoom,
                            height: viewHeight * zoom,
                            position: 'absolute',
                            left: imageLeft,
                            top: imageTop,
                        }}
                        resizeMode="contain"
                    />
                    <View style={styles.magnifierCrosshair} />
                </View>
            </View>
        );
    }

    render() {
        const { viewHeight, viewWidth, image, overlayPositions, topLeft, topRight, bottomLeft, bottomRight } = this.state;
        const { overlayColor, overlayOpacity, overlayStrokeColor, overlayStrokeWidth } = this.props;

        const handleSize = 50;

        return (
            <View
                style={{
                    height: viewHeight,
                    width: viewWidth,
                    backgroundColor: 'black',
                }}
            >
                <View style={{ height: viewHeight, width: viewWidth }}>
                    <Image
                        style={{ height: viewHeight, width: viewWidth }}
                        resizeMode="contain"
                        source={{ uri: image }}
                    />
                    <Svg
                        height={viewHeight}
                        width={viewWidth}
                        style={{ position: 'absolute', left: 0, top: 0 }}
                    >
                        <AnimatedPolygon
                            fill={overlayColor || 'rgba(255, 130, 0, 0.3)'}
                            fillOpacity={overlayOpacity || 1}
                            stroke={overlayStrokeColor || 'rgba(255, 130, 0, 1)'}
                            points={overlayPositions}
                            strokeWidth={overlayStrokeWidth || 2}
                        />
                    </Svg>

                    {/* Top Left */}
                    <Animated.View
                        {...this.panResponderTopLeft.panHandlers}
                        style={[
                            topLeft.getLayout(),
                            styles.handler,
                            { 
                                width: handleSize, 
                                height: handleSize,
                                marginLeft: -handleSize,
                                marginTop: -handleSize,
                                borderTopLeftRadius: handleSize / 2,
                                borderTopRightRadius: handleSize / 2,
                                borderBottomLeftRadius: handleSize / 2,
                                borderBottomRightRadius: 0,
                                backgroundColor: 'rgba(255, 130, 0, 1)',
                            }
                        ]}
                    />

                    {/* Top Right */}
                    <Animated.View
                        {...this.panResponderTopRight.panHandlers}
                        style={[
                            topRight.getLayout(),
                            styles.handler,
                            { 
                                width: handleSize, 
                                height: handleSize,
                                marginLeft: 0,
                                marginTop: -handleSize,
                                borderTopLeftRadius: handleSize / 2,
                                borderTopRightRadius: handleSize / 2,
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: handleSize / 2,
                                backgroundColor: 'rgba(255, 130, 0, 1)',
                            }
                        ]}
                    />

                    {/* Bottom Left */}
                    <Animated.View
                        {...this.panResponderBottomLeft.panHandlers}
                        style={[
                            bottomLeft.getLayout(),
                            styles.handler,
                            { 
                                width: handleSize, 
                                height: handleSize,
                                marginLeft: -handleSize,
                                marginTop: 0,
                                borderTopLeftRadius: handleSize / 2,
                                borderTopRightRadius: 0,
                                borderBottomLeftRadius: handleSize / 2,
                                borderBottomRightRadius: handleSize / 2,
                                backgroundColor: 'rgba(255, 130, 0, 1)',
                            }
                        ]}
                    />

                    {/* Bottom Right */}
                    <Animated.View
                        {...this.panResponderBottomRight.panHandlers}
                        style={[
                            bottomRight.getLayout(),
                            styles.handler,
                            { 
                                width: handleSize, 
                                height: handleSize,
                                marginLeft: 0,
                                marginTop: 0,
                                borderTopLeftRadius: 0,
                                borderTopRightRadius: handleSize / 2,
                                borderBottomLeftRadius: handleSize / 2,
                                borderBottomRightRadius: handleSize / 2,
                                backgroundColor: 'rgba(255, 130, 0, 1)',
                            }
                        ]}
                    />
                </View>
                {this.renderMagnifier()}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    handler: {
        position: 'absolute',
        zIndex: 100,
    },
    magnifierContainer: {
        position: 'absolute',
        width: 124,
        height: 124,
        borderRadius: 62,
        backgroundColor: 'white',
        padding: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 10,
        zIndex: 1000,
    },
    magnifierWindow: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    magnifierCrosshair: {
        position: 'absolute',
        left: 58,
        top: 58,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 130, 0, 1)',
        borderWidth: 1,
        borderColor: 'white',
    },
});

export default CustomCrop;

