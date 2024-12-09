import { util } from './util.js';
import { like } from './like.js';

import { theme } from './theme.js';
import { audio } from './audio.js';
import { offline } from './offline.js';

import { progress } from './progress.js';


document.addEventListener('DOMContentLoaded', () => {
    theme.init();
    audio.init();
    guest.init();
    offline.init();
    progress.init();
    pagination.init();
    window.AOS.init();

    window.like = like;
    window.util = util;
    window.guest = guest;
    window.theme = theme;
    window.audio = audio;
    window.comment = comment;
    window.pagination = pagination;
});
