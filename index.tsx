/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel } from "discord-types/general";

import { addContextMenus, removeContextMenus, requireSettingsMenu } from "./contextMenu";
import { categories, getCategories } from "./data";
import * as data from "./data";

getCategories();
export default definePlugin({
    name: "BetterPinDms",
    description: "Pin DMs but with categories",
    authors: [Devs.Aria],

    patches: [
        {
            find: ".privateChannelsHeaderContainer,",
            replacement: [
                {
                    match: /(?<=\w,{channels:\w,)privateChannelIds:(\w)/,
                    replace: "privateChannelIds:$1.filter(c=>!$self.isPinned(c)),pinCount:$self.usePinCount($1)"
                },
                {
                    match: /(renderRow:this\.renderRow,sections:)(\[\w,.{0,50})Math/,
                    replace: "$1$self.sections = $2...this.props.pinCount??[],Math"
                },
                {
                    match: /this\.renderSection=(\i)=>{/,
                    replace: "$&if($self.isCategoryIndex($1.section))return $self.renderCategory($1);"
                },
                // {
                //     match: /(this\.renderDM=\((\w),(\w)\)=>{.{1,200}this\.state,.{1,200})(\w\[\w\];return)/,
                //     replace: "$1$self.isCategoryIndex($2)?$self.getChannel($2,$3,this.props.channels):$4"
                // },
                {

                    match: /this\.renderDM=\((\w),(\w)\)=>{/,
                    replace: "$&if($self.isCategoryIndex($1))return $self.renderChannel($1,$2,this.props.channels);"
                },
                {
                    match: /(this\.getRowHeight=.{1,100}return 1===)(\w)/,
                    replace: "$1($2-$self.categoryLen())"
                }
            ]
        }
    ],
    data,
    isPinned: data.isPinned,

    sections: null as number[] | null,
    start() {
        addContextMenus();
        requireSettingsMenu();
    },

    stop() {
        removeContextMenus();
    },

    getSub() {
        return Vencord.Settings.plugins.PinDMs.enabled ? 2 : 1;
    },

    categoryLen() {
        return categories.length;
    },

    usePinCount(channelIds: string[]) {
        return channelIds.length ? this.getSections() : [];
    },

    getSections() {
        return categories.reduce((acc, category) => {
            acc.push(category.channels.length);
            return acc;
        }, [] as number[]);
    },

    isCategoryIndex(sectionIndex: number) {
        return this.sections && sectionIndex > (this.getSub() - 1) && sectionIndex < this.sections.length - 1;
    },

    getName(sectionIndex: number) {
        if (!this.isCategoryIndex(sectionIndex)) return;

        const category = categories[sectionIndex - this.getSub()];
        return category?.name;
    },

    renderCategory({ section }: { section: number; }) {
        const category = categories[section - this.getSub()];
        console.log("renderCat", section, category);

        return (
            <h1>{category?.name ?? "uh oh"}</h1>
        );
    },

    renderChannel(sectionIndex: number, index: number, channels: Record<string, Channel>) {
        const channel = this.getChannel(sectionIndex, index, channels);
        console.log("renderChannel", sectionIndex, index, channel);

        return (
            <div>
                <h1>{channel.rawRecipients[0].username}</h1>
            </div>
        );
    },

    getChannel(sectionIndex: number, index: number, channels: Record<string, Channel>) {
        const category = categories[sectionIndex - this.getSub()];
        const channelId = category?.channels[index];

        console.log("getChannel", sectionIndex, index, channelId);

        return channels[channelId];
    }
});

