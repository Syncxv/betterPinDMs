/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { extractAndLoadChunksLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Forms, Menu, TextInput, Toasts, useEffect, useState } from "@webpack/common";

import { addCategory as createCategory, addChannelToCategory, categories, Category, getCategory, isPinned, removeChannelFromCategory, updateCategory } from "./data";

interface ColorPickerProps {
    color: number | null;
    showEyeDropper?: boolean;
    onChange(value: number | null): void;
}

const ColorPicker = findComponentByCodeLazy<ColorPickerProps>(".BACKGROUND_PRIMARY).hex");

export const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}el\("(.+?)"\).{0,50}"UserSettings"/);

interface Props {
    categoryId: string | null;
    initalChannelId: string | null;
    modalProps: ModalProps;
    forceUpdate: () => void;
}

const useCategory = (categoryId: string | null, initalChannelId: string | null) => {
    const [category, setCategory] = useState<Category | null>(null);

    useEffect(() => {
        if (categoryId)
            setCategory(getCategory(categoryId)!);
        else if (initalChannelId)
            setCategory({
                id: Toasts.genId(),
                name: `Pin Category ${categories.length + 1}`,
                color: 0,
                channels: [initalChannelId]
            });
    }, []);

    return {
        category,
        setCategory
    };
};

export function NewCategoryModal({ categoryId, modalProps, initalChannelId, forceUpdate }: Props) {
    const { category, setCategory } = useCategory(categoryId, initalChannelId);

    if (!category) return null;

    const onClick = async () => {
        if (!categoryId)
            await createCategory(category);
        else
            await updateCategory(category);

        forceUpdate();
        modalProps.onClose();
    };

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle>New Category</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle>Name</Forms.FormTitle>
                <TextInput
                    value={category.name}
                    onChange={e => setCategory({ ...category, name: e })}
                />

                <Forms.FormTitle>Color</Forms.FormTitle>
                <ColorPicker
                    key={category.name}
                    color={category.color}
                    onChange={c => setCategory({ ...category, color: c! })}
                />
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClick} disabled={!category.name}>{categoryId ? "Edit" : "Create"}</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export const openCategoryModal = (categoryId: string | null, channelId: string | null, forceUpdate: () => void) =>
    openModal(modalProps => <NewCategoryModal categoryId={categoryId} modalProps={modalProps} initalChannelId={channelId} forceUpdate={forceUpdate} />);

function PinMenuItem(channelId: string, forceUpdate: () => void) {
    const pinned = isPinned(channelId);

    return (
        <Menu.MenuItem
            id="better-pin-dm"
            label="Pin DMs"
        >

            {!pinned && (
                <>
                    <Menu.MenuItem
                        id="add-category"
                        label="Add Category"
                        color="brand"
                        action={() => openCategoryModal(null, channelId, forceUpdate)}
                    />
                    <Menu.MenuSeparator />

                    {
                        categories.map(category => (
                            <Menu.MenuItem
                                id={`pin-category-${category.name}`}
                                label={category.name}
                                action={() => addChannelToCategory(channelId, category.id).then(() => forceUpdate())}
                            />
                        ))
                    }
                </>
            )}

            {pinned && (
                <Menu.MenuItem
                    id="unpin-dm"
                    label="Unpin DM"
                    color="danger"
                    action={() => removeChannelFromCategory(channelId).then(() => forceUpdate())}
                />
            )}

        </Menu.MenuItem>
    );
}

const GroupDMContext = (forceUpdate: () => void): NavContextMenuPatchCallback => (children, props) => () => {
    const container = findGroupChildrenByChildId("leave-channel", children);
    if (container)
        container.unshift(PinMenuItem(props.channel.id, forceUpdate));
};

const UserContext = (forceUpdate: () => void): NavContextMenuPatchCallback => (children, props) => () => {
    const container = findGroupChildrenByChildId("close-dm", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "close-dm");
        container.splice(idx, 0, PinMenuItem(props.channel.id, forceUpdate));
    }
};

export function addContextMenus(forceUpdate: () => void) {
    addContextMenuPatch("gdm-context", GroupDMContext(forceUpdate));
    addContextMenuPatch("user-context", UserContext(forceUpdate));
}

export function removeContextMenus(forceUpdate: () => void) {
    removeContextMenuPatch("gdm-context", GroupDMContext(forceUpdate));
    removeContextMenuPatch("user-context", UserContext(forceUpdate));
}
