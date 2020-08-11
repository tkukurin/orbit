import { action } from "@storybook/addon-actions";
import React from "react";
import { View } from "react-native";
import { colors } from "../styles";
import Button from "./Button";
import { IconName } from "./Icon";
import Spacer from "./Spacer";

export default {
  title: "Button",
  component: Button,
};

export function PlainButton() {
  return (
    <View>
      <Button
        title="Button"
        onPress={action("Button clicked")}
        accentColor={colors.fg[1]}
        onPendingInteractionStateDidChange={(isPendingActivation) =>
          action(`Pending activation`)(isPendingActivation)
        }
      />
      <Spacer units={1} />
      <Button
        title="Disabled"
        onPress={action("Button clicked")}
        accentColor={colors.fg[1]}
        disabled
      />
    </View>
  );
}

export function IconButton() {
  return (
    <View>
      <View>
        <Button
          title="Button"
          onPress={action("Button clicked")}
          iconName={IconName.Check}
          accentColor={colors.fg[1]}
        />
      </View>
      <Spacer units={1} />
      <View>
        <Button
          title="Disabled"
          onPress={action("Button clicked")}
          iconName={IconName.Check}
          accentColor={colors.fg[1]}
          disabled
        />
      </View>
    </View>
  );
}

export function LinkButton() {
  return (
    <View>
      <View>
        <Button
          title="Link button"
          href="https://google.com"
          accentColor={colors.fg[1]}
        />
      </View>
    </View>
  );
}
