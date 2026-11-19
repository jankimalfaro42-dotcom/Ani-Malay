
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const GRAIN_COUNT = 9;

function PalayLeaf({
  side,
  bottom,
  delay,
  color,
}: {
  side: 'left' | 'right';
  bottom: number;
  delay: number;
  color: string;
}) {
  const growth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(growth, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animation.start();

    return () => growth.stopAnimation();
  }, []);

  const width = growth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 72],
  });

  const opacity = growth.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.8, 1],
  });

  return (
    <Animated.View
      style={[
        styles.leafAnchor,
        {
          bottom,
          width,
          opacity,
          left: side === 'right' ? 0 : undefined,
          right: side === 'left' ? 0 : undefined,
        },
      ]}
    >
      <View
        style={[
          styles.leafShape,
          {
            backgroundColor: color,
            borderTopRightRadius: side === 'right' ? 80 : 4,
            borderBottomLeftRadius: side === 'right' ? 4 : 80,
            transform: [
              {
                rotate: side === 'right' ? '-28deg' : '205deg',
              },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}

function PalayStalk({
  height,
  side,
  delay,
}: {
  height: number;
  side: 'left' | 'center' | 'right';
  delay: number;
}) {
  const growth = useRef(new Animated.Value(0)).current;
  const grainOpacity = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const growAnimation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(growth, {
        toValue: height,
        duration: 1650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    const grainAnimation = Animated.sequence([
      Animated.delay(delay + 1750),
      Animated.timing(grainOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
    ]);

    growAnimation.start();
    grainAnimation.start();

    const swayAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    const swayTimer = setTimeout(() => {
      swayAnimation.start();
    }, delay + 2500);

    return () => {
      clearTimeout(swayTimer);
      growth.stopAnimation();
      grainOpacity.stopAnimation();
      swayAnimation.stop();
    };
  }, []);

  const positions = {
    left: 30,
    center: 76,
    right: 122,
  };

  const initialRotation =
    side === 'left' ? '-12deg' :
    side === 'right' ? '12deg' : '0deg';

  const rotation = sway.interpolate({
    inputRange: [0, 1],
    outputRange: ['-1.5deg', '1.5deg'],
  });

  const grainCount = side === 'center' ? 8 : 6;

  return (
    <Animated.View
      style={[
        styles.stalk,
        {
          left: positions[side],
          height: growth,
          transform: [{ rotate: rotation }],
        },
      ]}
    >
      <View
        style={[
          styles.stem,
          {
            transform: [{ rotate: initialRotation }],
          },
        ]}
      />

      <PalayLeaf
        side="right"
        bottom={48}
        delay={delay + 350}
        color="#528447"
      />

      <PalayLeaf
        side="left"
        bottom={82}
        delay={delay + 850}
        color="#83ad52"
      />

      <Animated.View
        style={[
          styles.palayHead,
          { opacity: grainOpacity },
        ]}
      >
        {Array.from({ length: grainCount }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.palayGrain,
              index % 2 === 0 && { marginLeft: 10 },
            ]}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function GrainLoader() {
  const animations = useRef(
    Array.from({ length: GRAIN_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const loops = animations.map((animation, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(animation, {
            toValue: 1,
            duration: 550,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 550,
            useNativeDriver: true,
          }),
        ])
      )
    );

    loops.forEach((loop) => loop.start());

    return () => loops.forEach((loop) => loop.stop());
  }, []);

  return (
    <View style={styles.grainLoader}>
      {animations.map((animation, index) => {
        const opacity = animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.25, 1],
        });

        const scale = animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.65, 1.15],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.loadingGrain,
              {
                opacity,
                transform: [{ scale }, { rotate: '-35deg' }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function LoadingScreen() {
  const glow = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.delay(1500),
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    glowAnimation.start();

    return () => glowAnimation.stop();
  }, []);

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.15],
  });

  return (
    <Animated.View style={[styles.splash, { opacity: contentOpacity }]}>
      <StatusBar style="dark" />

      <View style={styles.loadingContent}>
        <View style={styles.palayScene}>
          <Animated.View
            style={[
              styles.palayGlow,
              {
                opacity: glow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          <PalayStalk height={112} side="left" delay={200} />
          <PalayStalk height={155} side="center" delay={500} />
          <PalayStalk height={125} side="right" delay={800} />

          <View style={styles.palayGround} />
        </View>

        <Animated.View
          style={[styles.loadingBrand, { opacity: brandOpacity }]}
        >
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={styles.loadingLogo}
            resizeMode="contain"
          />

          <Text style={styles.brandName}>Ani-Malay</Text>

          <Text style={styles.tagline}>
            FRESH. LOCAL. SUSTAINABLE.
          </Text>
        </Animated.View>

        <GrainLoader />

        <Text style={styles.loadingMessage}>
          Growing a better future...
        </Text>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.home}>
      <StatusBar style="light" />

      <View style={styles.homeHeader}>
        <Text style={styles.homeBrand}>🌾 Ani-Malay</Text>
        <Text style={styles.welcome}>Welcome to Ani-Malay!</Text>
        <Text style={styles.homeTagline}>
          Fresh. Local. Sustainable.
        </Text>
      </View>

      <View style={styles.homeContent}>
        <Text style={styles.sectionTitle}>
          Discover Local Products
        </Text>
        <Text style={styles.placeholder}>
          Your agricultural marketplace starts here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#f1f3e9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loadingContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  palayScene: {
    width: 250,
    height: 205,
    alignSelf: 'center',
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  palayGlow: {
    position: 'absolute',
    width: 180,
    height: 150,
    bottom: 20,
    alignSelf: 'center',
    borderRadius: 100,
    backgroundColor: 'rgba(213, 190, 103, 0.25)',
  },
  stalk: {
    position: 'absolute',
    bottom: 25,
    width: 5,
    overflow: 'visible',
  },
  stem: {
    position: 'absolute',
    bottom: 0,
    width: 5,
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#65934b',
  },
  leafAnchor: {
    position: 'absolute',
    height: 18,
    overflow: 'visible',
  },
  leafShape: {
    width: '100%',
    height: 12,
    borderRadius: 50,
  },
  palayHead: {
    position: 'absolute',
    top: -14,
    left: -2,
    gap: 5,
    transform: [{ rotate: '-25deg' }],
  },
  palayGrain: {
    width: 16,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#d5a52f',
  },
  palayGround: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 150,
    height: 12,
    borderRadius: 50,
    backgroundColor: '#ad9466',
  },
  loadingBrand: {
    alignItems: 'center',
    marginTop: 0,
  },
  loadingLogo: {
    width: 70,
    height: 70,
    borderRadius: 18,
    marginVertical: 8,
  },
  brandName: {
    color: '#2d7752',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    color: '#789078',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 9,
  },
  grainLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 32,
    height: 20,
  },
  loadingGrain: {
    width: 9,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#d5a52f',
  },
  loadingMessage: {
    color: '#66836a',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 12,
  },
  home: {
    flex: 1,
    backgroundColor: '#f7f9f6',
  },
  homeHeader: {
    backgroundColor: '#2d7752',
    paddingTop: 65,
    paddingHorizontal: 24,
    paddingBottom: 35,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  homeBrand: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: 'bold',
    marginBottom: 35,
  },
  welcome: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: 'bold',
  },
  homeTagline: {
    color: '#e5f3e9',
    fontSize: 15,
    marginTop: 8,
  },
  homeContent: {
    padding: 24,
  },
  sectionTitle: {
    color: '#244b35',
    fontSize: 21,
    fontWeight: 'bold',
  },
  placeholder: {
    color: '#66756a',
    fontSize: 14,
    marginTop: 10,
  },
});
