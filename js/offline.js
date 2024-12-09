export const offline = (() => {

    let alert = null;
    let online = true;
    let abort = [];

    const show = (isUp = true) => new Promise((res) => {
        let op = parseFloat(alert.style.opacity);
        let clear = null;

        const callback = () => {
            if (!isUp && op > 0) {
                op -= 0.05;
                alert.style.opacity = op.toFixed(2);
                return;
            }

            if (isUp && op < 1) {
                op += 0.05;
                alert.style.opacity = op.toFixed(2);
                return;
            }

            res();
            clearInterval(clear);
            clear = null;

            if (op <= 0) {
                alert.style.opacity = '0';
                return;
            }

            if (op >= 1) {
                alert.style.opacity = '1';
                return;
            }
        };

        clear = setInterval(callback, 10);
    });

    const hide = () => {
        let t = null;
        t = setTimeout(() => {
            clearTimeout(t);
            t = null;

            setDefaultState();
        }, 3000);
    };

    const setOffline = () => {
        const el = alert.firstElementChild.firstElementChild;
        el.classList.remove('bg-success');
        el.classList.add('bg-danger');
        el.firstElementChild.innerHTML = '<i class="fa-solid fa-ban me-1"></i>Koneksi tidak tersedia';
    };

    const setOnline = () => {
        const el = alert.firstElementChild.firstElementChild;
        el.classList.remove('bg-danger');
        el.classList.add('bg-success');
        el.firstElementChild.innerHTML = '<i class="fa-solid fa-cloud me-1"></i>Koneksi tersedia kembali';
    };

    const setDefaultState = async () => {
        await show(false);
        setOffline();
    };

    const changeState = () => {
        document.querySelectorAll('button[offline-disabled], input[offline-disabled], select[offline-disabled], textarea[offline-disabled]').forEach((e) => {
            e.dispatchEvent(new Event(isOnline() ? 'online' : 'offline'));

            if (e.tagName === 'BUTTON') {
                isOnline() ? e.classList.remove('disabled') : e.classList.add('disabled');
                return;
            }

            isOnline() ? e.removeAttribute('disabled') : e.setAttribute('disabled', 'true');
        });
    };

    const onOffline = () => {
        online = false;

        setOffline();
        show();
        changeState();
        abort.forEach((a) => a());
    };

    const onOnline = () => {
        online = true;

        setOnline();
        hide();
        changeState();
    };

    const isOnline = () => online;

    const addAbort = (callback) => {
        abort.push(callback);
    };

    const init = () => {
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        alert = document.getElementById('offline-mode');
    };

    return {
        init,
        isOnline,
        addAbort,
    };
})();