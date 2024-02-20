/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

export interface Category {
    id: string;
    name: string;
    color: number;
    channels: string[];
}

const CATEGORY_ID = "betterPinDmsCategories";

export let categories: Category[];

export async function getCategories() {
    if (!categories) {
        categories = await DataStore.get<Category[]>(CATEGORY_ID) ?? [];
    }
    return categories;
}

export async function addCategory(category: Category) {
    categories.push(category);
    await DataStore.set(CATEGORY_ID, categories);
}

export async function addChannelToCategory(channelId: string, categoryId: string) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    if (category.channels.includes(channelId)) return;

    category.channels.push(channelId);
    await DataStore.set(CATEGORY_ID, categories);

}

export async function removeChannelFromCategory(channelId: string) {
    const category = categories.find(c => c.channels.includes(channelId));
    if (!category) return;

    category.channels = category.channels.filter(c => c !== channelId);
    await DataStore.set(CATEGORY_ID, categories);
}

export async function removeCategory(category: Category) {
    categories = categories.filter(c => c !== category);
    await DataStore.set(CATEGORY_ID, categories);
}

export function isPinned(id: string) {
    return categories.some(c => c.channels.includes(id));
}
