/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { extractAndLoadChunksLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Forms, Text, TextInput, Toasts, useEffect, useState } from "@webpack/common";

import { categories, Category, createCategory, getCategory, updateCategory } from "../data";

interface ColorPickerProps {
    color: number | null;
    showEyeDropper?: boolean;
    suggestedColors?: string[];
    onChange(value: number | null): void;
}

interface ColorPickerWithSwatchesProps {
    defaultColor: number;
    colors: number[];
    value: number;
    disabled?: boolean;
    onChange(value: number | null): void;
    renderDefaultButton?: () => React.ReactNode;
    renderCustomButton?: () => React.ReactNode;
}

const ColorPicker = findComponentByCodeLazy<ColorPickerProps>(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");
const ColorPickerWithSwatches = findComponentByCodeLazy<ColorPickerWithSwatchesProps>('"color-picker"', ".customContainer");

export const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}el\("(.+?)"\).{0,50}"UserSettings"/);

const cl = classNameFactory("vc-pindms-modal-");

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
                color: 10070709,
                colapsed: false,
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
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>{categoryId ? "Edit" : "New"} Category</Text>
            </ModalHeader>

            <ModalContent className={cl("content")}>
                <Forms.FormSection>
                    <Forms.FormTitle>Name</Forms.FormTitle>
                    <TextInput
                        value={category.name}
                        onChange={e => setCategory({ ...category, name: e })}
                    />
                </Forms.FormSection>

                <Forms.FormDivider />

                <Forms.FormSection>
                    <Forms.FormTitle>Color</Forms.FormTitle>
                    <ColorPickerWithSwatches
                        key={category.name}
                        defaultColor={10070709}
                        colors={[1752220, 3066993, 3447003, 10181046, 15277667, 15844367, 15105570, 15158332, 9807270, 6323595, 1146986, 2067276, 2123412, 7419530, 11342935, 12745742, 11027200, 10038562, 9936031, 5533306]}
                        onChange={c => setCategory({ ...category, color: c! })}
                        value={category.color}
                        renderDefaultButton={() => null}
                        renderCustomButton={() => (
                            <ColorPicker
                                color={category.color}
                                onChange={c => setCategory({ ...category, color: c! })}
                                key={category.name}
                                showEyeDropper={false}
                            />
                        )}
                    />
                </Forms.FormSection>
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClick} disabled={!category.name}>{categoryId ? "Save" : "Create"}</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export const openCategoryModal = (categoryId: string | null, channelId: string | null, forceUpdate: () => void) =>
    openModal(modalProps => <NewCategoryModal categoryId={categoryId} modalProps={modalProps} initalChannelId={channelId} forceUpdate={forceUpdate} />);

