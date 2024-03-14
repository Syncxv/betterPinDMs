/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Settings } from "@api/Settings";
import { UserStore } from "@webpack/common";

import { DEFAULT_COLOR } from "./constants";

export interface Category {
    id: string;
    name: string;
    color: number;
    channels: string[];
    collapsed?: boolean;
}

export const KEYS = {
    CATEGORY_BASE_KEY: "BetterPinDMsCategories-",
    CATEGORY_MIGRATED_PINDMS_KEY: "BetterPinDMsMigratedPinDMs",
    CATEGORY_MIGRATED_KEY: "BetterPinDMsMigratedOldCategories",
    OLD_CATEGORY_KEY: "betterPinDmsCategories"
};


export let categories: Category[] = [];

export async function saveCats(cats: Category[]) {
    const { id } = UserStore.getCurrentUser();
    await DataStore.set(KEYS.CATEGORY_BASE_KEY + id, cats);
}

export async function initCategories(userId: string) {
    categories = await DataStore.get<Category[]>(KEYS.CATEGORY_BASE_KEY + userId) ?? [];
}

export function getCategory(id: string) {
    return categories.find(c => c.id === id);
}

export async function createCategory(category: Category) {
    categories.push(category);
    saveCats(categories);
}

export async function updateCategory(category: Category) {
    const index = categories.findIndex(c => c.id === category.id);
    if (index === -1) return;

    categories[index] = category;
    saveCats(categories);
}

export async function moveChannelToCategory(channelId: string, categoryId: string) {    
    
    const targetcategory = categories.find(c => c.id === categoryId);
    if (!targetcategory) return;

    const oldcategory = categories.find(c => c.channels.includes(channelId));
    if (oldcategory) oldcategory.channels = oldcategory.channels.filter(c => c !== channelId); 
    // remove channel from old category if it was in one 
    
    if (categoryId !== '0') targetcategory.channels.push(channelId);
    // if categoryId is not 0, add channel to category

    saveCats(categories);

}

/* substituted with an implementation of "moveChannelToCategory";
export async function addChannelToCategory(channelId: string, categoryId: string) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    if (category.channels.includes(channelId)) return;

    category.channels.push(channelId);
    saveCats(categories);
} 
*/

export async function removeChannelFromCategory(channelId: string) {
    const category = categories.find(c => c.channels.includes(channelId));
    if (!category) return;

    category.channels = category.channels.filter(c => c !== channelId);
    saveCats(categories);
}

export async function removeCategory(categoryId: string) {
    const catagory = categories.find(c => c.id === categoryId);
    if (!catagory) return;

    catagory?.channels.forEach(c => removeChannelFromCategory(c));
    categories = categories.filter(c => c.id !== categoryId);
    saveCats(categories);
}

export function isPinned(id: string) {
    return categories.some(c => c.channels.includes(id));
}




export const canMoveArrayInDirection = (array: any[], index: number, direction: -1 | 1) => {
    const a = array[index];
    const b = array[index + direction];

    return a && b;
};

export const canMoveCategoryInDirection = (id: string, direction: -1 | 1) => {
    const index = categories.findIndex(m => m.id === id);
    return canMoveArrayInDirection(categories, index, direction);
};

export const canMoveCategory = (id: string) => canMoveCategoryInDirection(id, -1) || canMoveCategoryInDirection(id, 1);

export const canMoveChannelInDirection = (channelId: string, direction: -1 | 1) => {
    const category = categories.find(c => c.channels.includes(channelId));
    if (!category) return false;

    const index = category.channels.indexOf(channelId);
    return canMoveArrayInDirection(category.channels, index, direction);
};


function swapElementsInArray(array: any[], index1: number, index2: number) {
    if (!array[index1] || !array[index2]) return;
    [array[index1], array[index2]] = [array[index2], array[index1]];
}


export async function moveCategory(id: string, direction: -1 | 1) {
    const a = categories.findIndex(m => m.id === id);
    const b = a + direction;

    swapElementsInArray(categories, a, b);

    saveCats(categories);
}

export async function moveChannel(channelId: string, direction: -1 | 1) {
    const category = categories.find(c => c.channels.includes(channelId));
    if (!category) return;

    const a = category.channels.indexOf(channelId);
    const b = a + direction;

    swapElementsInArray(category.channels, a, b);

    saveCats(categories);
}

export async function collapseCategory(id: string, value = true) {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    category.collapsed = value;
    saveCats(categories);
}


const getPinDMsPins = () => (Settings.plugins.PinDMs.pinnedDMs || void 0)?.split(",") as string[] | undefined;

async function migratePinDMs() {
    if (categories.some(m => m.id === "oldPins")) {
        return await DataStore.set(KEYS.CATEGORY_MIGRATED_PINDMS_KEY, true);
    }

    const pindmspins = getPinDMsPins();

    // we dont want duplicate pins
    const difference = [...new Set(pindmspins)]?.filter(m => !categories.some(c => c.channels.includes(m)));
    if (difference?.length) {
        categories.push({
            id: "oldPins",
            name: "Pins",
            color: DEFAULT_COLOR,
            channels: difference
        });
    }

    await DataStore.set(KEYS.CATEGORY_MIGRATED_PINDMS_KEY, true);
}

async function migrateOldCategories() {
    const oldCats = await DataStore.get<Category[]>(KEYS.OLD_CATEGORY_KEY);
    // dont want to migrate if the user has already has categories.
    if (categories.length === 0 && oldCats?.length) {
        categories.push(...(oldCats.filter(m => m.id !== "oldPins")));
    }
    await DataStore.set(KEYS.CATEGORY_MIGRATED_KEY, true);
}

export async function migrateData() {
    const m1 = await DataStore.get(KEYS.CATEGORY_MIGRATED_KEY), m2 = await DataStore.get(KEYS.CATEGORY_MIGRATED_PINDMS_KEY);
    if (m1 && m2) return;

    // want to migrate the old categories first and then slove any conflicts with the PinDMs pins
    if (!m1) await migrateOldCategories();
    if (!m2) await migratePinDMs();

    await saveCats(categories);
}
