import {
  ColorPaletteName,
  generateUniqueID,
  mainTaskComponentID,
} from "@withorbit/core2";
import { core2 as fixtures } from "@withorbit/sample-data";
import { ReviewAreaItem } from "../../reviewAreaItem";
import * as styles from "../../styles";

export function generateReviewItem(
  questionText: string,
  answerText: string,
  contextString: string,
  colorPaletteName: ColorPaletteName,
): ReviewAreaItem {
  return {
    taskID: generateUniqueID(),
    colorPalette: styles.colors.palettes[colorPaletteName],
    provenance: {
      identifier: "Web",
      title: contextString,
      url: "http://foo.com",
    },
    componentID: mainTaskComponentID,
    spec: {
      ...fixtures.testQASpec,
    },
  };
}
