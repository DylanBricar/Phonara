import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "../../bindings";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";

interface ChannelSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const ChannelSelector: React.FC<ChannelSelectorProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting } = useSettings();
    const [channelCount, setChannelCount] = useState<number>(1);
    const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
    const [updating, setUpdating] = useState(false);

    const selectedMicrophone = getSetting("selected_microphone") || "default";

    const fetchChannelInfo = useCallback(async () => {
      try {
        const channelsResult = await commands.getMicrophoneChannels(
          selectedMicrophone === "Default" ? "default" : selectedMicrophone,
        );
        if (channelsResult.status === "ok") {
          setChannelCount(channelsResult.data);
        }

        const selectedResult = await commands.getSelectedChannel();
        if (selectedResult.status === "ok") {
          setSelectedChannel(selectedResult.data);
        }
      } catch (error) {
        console.error("Failed to fetch channel info:", error);
      }
    }, [selectedMicrophone]);

    useEffect(() => {
      fetchChannelInfo();
    }, [fetchChannelInfo]);

    const handleChannelSelect = async (value: string) => {
      setUpdating(true);
      const channel = value === "average" ? null : parseInt(value, 10);
      const result = await commands.setSelectedChannel(channel);
      if (result.status === "ok") {
        setSelectedChannel(channel);
      }
      setUpdating(false);
    };

    // Only show when the device has more than 1 channel
    if (channelCount <= 1) {
      return null;
    }

    const options = [
      { value: "average", label: t("settings.sound.channel.average") },
      ...Array.from({ length: channelCount }, (_, i) => ({
        value: String(i),
        label: t("settings.sound.channel.channel", { n: i + 1 }),
      })),
    ];

    const currentValue =
      selectedChannel === null ? "average" : String(selectedChannel);

    return (
      <SettingContainer
        title={t("settings.sound.channel.title")}
        description={t("settings.sound.channel.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <Dropdown
          options={options}
          selectedValue={currentValue}
          onSelect={handleChannelSelect}
          disabled={updating}
        />
      </SettingContainer>
    );
  },
);
