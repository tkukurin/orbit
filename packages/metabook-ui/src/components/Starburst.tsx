import { getIntervalSequenceForSchedule } from "metabook-core";
import React, { useRef } from "react";
import { Animated } from "react-native";
import Svg, { ClipPath, G, Path } from "react-native-svg";
import lerp from "../util/lerp";
import usePrevious from "./hooks/usePrevious";
import { useTransitioningValue } from "./hooks/useTransitioningValue";
import WithAnimatedValue = Animated.WithAnimatedValue;

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Returns the distance from the center of the starburst to the point of each ray's tapered quill.
export function getStarburstQuillInnerRadius(
  rayCount: number,
  thickness: number,
): number {
  const innerRadiusSpacing = thickness / 3.25; // The number of pixels space between spokes at their tapered points.
  const segmentAngle = (2 * Math.PI) / rayCount;
  return (innerRadiusSpacing * 2.0) / Math.sin(segmentAngle);
}

// Returns the distance from the center of the starburst to the end of each ray's tapered quill (i.e. where the ray becomes a simple stroke).
export function getStarburstQuillOuterRadius(
  rayCount: number,
  thickness: number,
): number {
  const outerRadiusSpacing = thickness / 2.75; // The number of pixels space between between spokes at their thickest points.
  const segmentAngle = (2 * Math.PI) / rayCount;
  return (thickness + outerRadiusSpacing * 2.0) / Math.sin(segmentAngle);
}

// Returns the length of a ray, measured from the center of the starburst to its outer tip.
export function getStarburstRayLength(
  value: number,
  quillOuterRadius: number,
  starburstRadius: number,
): number {
  return lerp(value, 0, 1, quillOuterRadius * 2.0, starburstRadius);
}

const sequence = getIntervalSequenceForSchedule("default");
export function getStarburstRayValueForInterval(intervalMillis: number) {
  if (intervalMillis <= 0) {
    return 0;
  }

  // TODO: these constants will need to move somewhere to avoid coupling with StarburstLegend.
  const firstInterval = sequence[1].interval;
  const maxInterval = sequence[sequence.length - 1].interval;

  return lerp(
    Math.log2(intervalMillis),
    Math.log2(firstInterval),
    Math.log2(maxInterval),
    0.1,
    1,
  );
}

function getRayPath(
  innerRadius: number,
  outerRadius: number,
  strokeRadius: number,
  theta: number,
  thickness: number,
): string {
  const unitX = Math.cos(theta);
  const unitY = -1 * Math.sin(theta);
  const x1 = outerRadius * unitX;
  const x2 = strokeRadius * unitX;
  const y1 = outerRadius * unitY;
  const y2 = strokeRadius * unitY;
  const xThickness = 0.5 * thickness * -unitY;
  const yThickness = 0.5 * thickness * unitX;

  const localQuillLength = outerRadius - innerRadius;
  // The coordinates for the tapered quill at the end of the starburst rays were extracted from an SVG. This function transforms a point in that template SVG's coordinate space to the space of the ray.
  function quillPoint(x: number, y: number) {
    const quillPathLength = 1.75;
    // Translate the center of the quill tip to the origin.
    x -= 0.5 * quillPathLength;
    y -= 0.5; // The quill is 1pt high in the template SVG.
    // Scale it to the appropriate length and thickness.
    x *= localQuillLength / quillPathLength;
    y *= thickness;
    // Translate it so that its tip touches the inner radius.
    x += innerRadius + 0.5 * localQuillLength;
    // We keep y as is, centered about the middle of the quill.
    // Rotate it about the inner radius circle.
    const finalX = unitX * x - unitY * y;
    const finalY = unitY * x + unitX * y;
    return `${finalX} ${finalY}`;
  }

  return `M${quillPoint(0.875, 0.10825)}C${quillPoint(
    0.5835,
    0.18575,
  )} ${quillPoint(0.29175, 0.293)} ${quillPoint(0, 0.5)}C${quillPoint(
    0.29175,
    0.707,
  )} ${quillPoint(0.5835, 0.81425)} ${quillPoint(0.875, 0.89175)}C${quillPoint(
    1.16675,
    0.965,
  )} ${quillPoint(1.45825, 0.99925)} ${quillPoint(1.75, 1)}L${quillPoint(
    1.75,
    0,
  )} ${x2 - xThickness} ${y2 - yThickness} ${x2 + xThickness} ${
    y2 + yThickness
  } ${x1 + xThickness} ${y1 + yThickness} ${x1 - xThickness} ${
    y1 - yThickness
  }C${quillPoint(1.45825, 0.000750005)} ${quillPoint(
    1.16675,
    0.035,
  )} ${quillPoint(0.875, 0.10825)}`;
}

interface AnimationState {
  entryIndex: number;
  fromValue: number;
  value: Animated.Value;
}

const animationTiming: Omit<Animated.SpringAnimationConfig, "toValue"> = {
  speed: 20,
  bounciness: 0,
  useNativeDriver: false,
};

export interface StarburstProps {
  diameter: number; // the diameter of the starburst
  entries: StarburstEntry[];
  thickness: number;
  accentOverlayColor?: string;
  entryAtHorizontal?: number;
  origin?: readonly [number, number]; // positions the tip of the 3:00 stroke of the starburst at this position, in pixels, expressed from the top-left of the starburst element
}

export interface StarburstEntry {
  value: number; // [0,1], where 0 will display as the shortest starburst ray and 1 the longest
  color: string;
}

export default React.memo(function Starburst({
  entries,
  diameter,
  thickness,
  accentOverlayColor,
  entryAtHorizontal,
  origin,
}: StarburstProps) {
  const previousEntries = usePrevious(entries);
  const canAnimateEntries =
    previousEntries && entries.length === previousEntries.length;
  const animationState = useRef<AnimationState>();

  const radius = diameter / 2;
  const unitThickness = thickness / radius;
  const quillInnerRadius = getStarburstQuillInnerRadius(
    entries.length,
    unitThickness,
  );
  const quillOuterRadius = getStarburstQuillOuterRadius(
    entries.length,
    unitThickness,
  );

  const allPaths: string[] = [];
  const pathsByColor: { [key: string]: string[] } = {};
  let animatingColorEntry: {
    color: string;
    index: number;
    fromPath: string;
  } | null = null;
  entries.forEach(({ value, color }, index) => {
    const theta = (-index / entries.length) * 2 * Math.PI;
    const strokeRadius = getStarburstRayLength(value, quillOuterRadius, 1);
    const path = getRayPath(
      quillInnerRadius,
      quillOuterRadius,
      strokeRadius,
      theta,
      unitThickness,
    );

    if (!pathsByColor[color]) {
      pathsByColor[color] = [];
    }
    pathsByColor[color].push(path);
    allPaths.push(path);

    // Start an animation if the entry has changed in length.
    if (canAnimateEntries && value !== previousEntries![index].value) {
      if (animationState.current) {
        animationState.current.value.stopAnimation();
      }
      const fromLength = previousEntries![index].value;
      const animatedLength = new Animated.Value(0);
      animationState.current = {
        entryIndex: index,
        fromValue: fromLength,
        value: animatedLength,
      };
      Animated.spring(animatedLength, {
        toValue: 1,
        ...animationTiming,
      }).start(() => {
        animationState.current = undefined;
      });
    }
    if (animationState.current?.entryIndex === index) {
      animatingColorEntry = {
        color,
        index: pathsByColor[color].length - 1,
        fromPath: getRayPath(
          quillInnerRadius,
          quillOuterRadius,
          getStarburstRayLength(
            animationState.current.fromValue,
            quillOuterRadius,
            1,
          ),
          theta,
          unitThickness,
        ),
      };
    }
  });

  const outerRotationDegrees = useTransitioningValue({
    value:
      entries.length > 0
        ? -((entryAtHorizontal ?? 0) * 360) / entries.length
        : 0,
    timing: { ...animationTiming, type: "spring" },
  }).interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });
  function getAnimatedPath(
    paths: string[],
    animatingEntry: { index: number; oldValue: string } | null,
  ) {
    const joinedPaths = paths.join(" ");
    let d: WithAnimatedValue<string>;
    if (animatingEntry === null) {
      d = joinedPaths;
    } else {
      d = animationState.current!.value.interpolate({
        inputRange: [0, 1],
        outputRange: [
          [
            ...paths.slice(0, animatingEntry.index),
            animatingEntry.oldValue,
            ...paths.slice(animatingEntry.index + 1),
          ].join(" "),
          joinedPaths,
        ],
      });
    }
    return d;
  }

  let viewBox: string;
  let width: number;
  let height: number;
  if (origin) {
    const x = -origin[0] / radius;
    const y = -origin[1] / radius;
    viewBox = `${x} ${y} ${1 - x} ${1 - y}`;
    width = radius + origin[0];
    height = radius + origin[1];
  } else {
    viewBox = "-1 -1 2 2";
    width = diameter;
    height = diameter;
  }

  return (
    <Svg height={height} width={width} viewBox={viewBox}>
      <AnimatedG
        // @ts-ignore The type definition is missing this prop, but it's there!
        style={{
          transform: [{ rotate: outerRotationDegrees }],
        }}
      >
        {Object.keys(pathsByColor).map((color) => {
          return (
            <AnimatedPath
              key={color}
              d={getAnimatedPath(
                pathsByColor[color],
                color === animatingColorEntry?.color
                  ? {
                      index: animatingColorEntry.index,
                      oldValue: animatingColorEntry.fromPath,
                    }
                  : null,
              )}
              fill={color}
            />
          );
        })}
      </AnimatedG>
      {accentOverlayColor && (
        <>
          <ClipPath id="accentPath">
            <Path
              d={getRayPath(
                quillInnerRadius,
                quillOuterRadius,
                1,
                0,
                unitThickness,
              )}
            />
          </ClipPath>
          <G clipPath="url(#accentPath)">
            <AnimatedG
              // @ts-ignore The type definition is missing this prop, but it's there!
              style={{
                transform: [{ rotate: outerRotationDegrees }],
              }}
            >
              <AnimatedPath
                d={getAnimatedPath(
                  allPaths,
                  animationState.current
                    ? {
                        index: animationState.current.entryIndex,
                        oldValue: animatingColorEntry!.fromPath,
                      }
                    : null,
                )}
                fill={accentOverlayColor}
              />
            </AnimatedG>
          </G>
        </>
      )}
    </Svg>
  );
});
