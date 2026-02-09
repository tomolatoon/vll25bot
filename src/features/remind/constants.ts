export const REMIND_COLOR_SUCCESS = 0x00ff00; // 緑
export const REMIND_COLOR_WARN = 0xffff00; // 黄
export const REMIND_COLOR_ERROR = 0xff0000; // 赤
export const REMIND_COLOR_INFO = 0x0099ff; // 青

export const BUTTON_ID_REMIND_CANCEL = "remind_cancel" as const;

// リスト操作用プレフィックス
export const LIST_SELECT_PREFIX = "remind_list_select" as const;
export const LIST_NAV_PREV_PREFIX = "remind_list_prev" as const;
export const LIST_NAV_NEXT_PREFIX = "remind_list_next" as const;
export const LIST_NAV_PAGE_PREFIX = "remind_list_page" as const;
export const LIST_ORDER_PREFIX = "remind_list_order" as const;
export const LIST_SHOW_PREFIX = "remind_list_show" as const;
export const LIST_EDIT_PREFIX = "remind_list_edit" as const;
export const LIST_CANCEL_PREFIX = "remind_list_cancel" as const;
export const LIST_RELOAD_PREFIX = "remind_list_reload" as const;
export const LIST_PAGE_JUMP_PREFIX = "remind_list_jump" as const;

export const LIST_PREFIXES = {
    "remind_list_select": "LIST_SELECT_PREFIX",
    "remind_list_prev": "LIST_NAV_PREV_PREFIX",
    "remind_list_next": "LIST_NAV_NEXT_PREFIX",
    "remind_list_page": "LIST_NAV_PAGE_PREFIX",
    "remind_list_order": "LIST_ORDER_PREFIX",
    "remind_list_show": "LIST_SHOW_PREFIX",
    "remind_list_edit": "LIST_EDIT_PREFIX",
    "remind_list_cancel": "LIST_CANCEL_PREFIX",
    "remind_list_reload": "LIST_RELOAD_PREFIX",
    "remind_list_jump": "LIST_PAGE_JUMP_PREFIX",
} as const;
