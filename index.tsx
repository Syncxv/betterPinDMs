/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ContextMenuApi, FluxDispatcher, Menu, useEffect, useState } from "@webpack/common";
import { Channel } from "discord-types/general";

import { addContextMenus, removeContextMenus, requireSettingsMenu } from "./contextMenu";
import { categories, getCategories } from "./data";
import * as data from "./data";

getCategories();

const headerClasses = findByPropsLazy("privateChannelsHeaderContainer");

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
                    replace: "privateChannelIds:$1.filter(c=>!$self.isPinned(c)),pinCount2:$self.usePinCount($1)"
                },
                {
                    match: /(renderRow:this\.renderRow,sections:)(\[\w,.{0,50})Math/,
                    replace: "$1$self.sections = $2...this.props.pinCount2??[],Math"
                },
                {
                    match: /this\.renderSection=(\i)=>{/,
                    replace: "$&if($self.isCategoryIndex($1.section))return $self.renderCategory(this,$1);"
                },
                // {
                //     match: /(this\.renderDM=\((\w),(\w)\)=>{.{1,200}this\.state,.{1,200})(\w\[\w\];return)/,
                //     replace: "$1$self.isCategoryIndex($2)?$self.getChannel($2,$3,this.props.channels):$4"
                // },
                {

                    match: /(this\.renderDM=\((\w),(\w)\)=>{)(.{1,300}return null==\w.{1,20}\((\w\.default),{channel:)/,
                    replace: "$1if($self.isCategoryIndex($2))return $self.renderChannel(this,$2,$3,this.props.channels,$5);$4"
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
    instance: null as any | null,
    x: 0,
    forceUpdate() {
        this.instance?.forceUpdate();
        this.x++;
    },
    start() {
        addContextMenus(this.forceUpdate.bind(this));
        requireSettingsMenu();
    },

    stop() {
        removeContextMenus(this.forceUpdate.bind(this));
    },

    getSub() {
        return Vencord.Settings.plugins.PinDMs.enabled ? 2 : 1;
    },

    categoryLen() {
        return categories.length;
    },

    usePinCount(channelIds: string[]) {
        const [cats, setCats] = useState<number[]>([]);
        useEffect(() => {
            if (channelIds.length > 0) {
                setCats(this.getSections());
            }
        }, [this.x, channelIds]);

        return cats;
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

    renderCategory(instance: any, { section }: { section: number; }) {
        this.instance = instance;
        const category = categories[section - this.getSub()];
        console.log("renderCat", section, category);

        if (!category) return null;

        return (
            <h1
                className={classes(headerClasses.privateChannelsHeaderContainer, "vc-pindms-section-container")}
                onContextMenu={e => {
                    ContextMenuApi.openContextMenu(e, () => (
                        <Menu.Menu
                            navId="vc-pindms-header-menu"
                            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                            color="danger"
                            aria-label="Pin DMs Category Menu"
                        >
                            <Menu.MenuItem
                                id="vc-pindms-delete-category"
                                color="danger"
                                label="Delete Category"
                                action={() => data.removeCategory(category.id).then(instance.forceUpdate())}
                            />
                        </Menu.Menu>
                    ));
                }}
            >
                <span className={headerClasses.headerText}>
                    {category?.name ?? "uh oh"}
                </span>
            </h1>
        );
    },

    // this is crazy
    renderChannel(instance: any, sectionIndex: number, index: number, channels: Record<string, Channel>, ChannelComponent: React.ComponentType<{ children: React.ReactNode, channel: Channel, selected: boolean; }>) {
        const channel = this.getChannel(sectionIndex, index, channels);
        console.log("renderChannel", sectionIndex, index, channel);

        if (!channel) return null;

        return (
            <ChannelComponent
                channel={channel}
                selected={instance.props.selectedChannelId === channel.id}
                aria-posinset={instance.state.preRenderedChildren + index + 1}
                aria-setsize={instance.state.totalRowCount}
            >
                {channel.id}
            </ChannelComponent>
        );
    },

    getChannel(sectionIndex: number, index: number, channels: Record<string, Channel>) {
        const category = categories[sectionIndex - this.getSub()];
        const channelId = category?.channels[index];

        console.log("getChannel", sectionIndex, index, channelId);

        return channels[channelId];
    }
});
