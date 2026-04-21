/**
 * LKZ Outstream Video Player - GitHub Version
 * Compliance: Google Ad Manager Policy-Safe
 */
(function() {
    // Determine configuration from data attributes or defaults
    const currentScript = document.currentScript;
    const AD_UNIT_PATH = currentScript.getAttribute('data-ad-unit') || '/21614972100/childpub-3';
    const MAX_REFRESHES = parseInt(currentScript.getAttribute('data-max-refresh')) || 10;
    const AD_TAG_BASE = 'https://pubads.g.doubleclick.net/gampad/ads?iu=' + AD_UNIT_PATH + '&description_url=' + encodeURIComponent(window.location.href) + '&sz=400x300|640x480&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&correlator=';

    let adsManager, adsLoader, adDisplayContainer, stickyObserver;
    let refreshCount = 0;

    // --- INJECT CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        :root { --lkz-primary: #00FF00; }
        .lkz-player-container { width: 100%; max-width: 640px; background: #000; position: relative; margin: 20px auto; border-radius: 12px; overflow: hidden; border: 1px solid #333; line-height: 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: sans-serif; transition: all 0.3s ease; }
        .lkz-video-frame { width: 100%; aspect-ratio: 16/9; position: relative; }
        #content-video, #ad-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
        .is-floating { position: fixed !important; bottom: 20px !important; right: 20px !important; width: 320px !important; z-index: 1000000 !important; background: rgba(0, 0, 0, 0.9) !important; border: 1px solid #444; line-height: normal; }
        .lkz-control-bar { position: absolute; bottom: 0; left: 0; width: 100%; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 10px; box-sizing: border-box; z-index: 1000001; opacity: 0; transition: opacity 0.3s; }
        .lkz-player-container:hover .lkz-control-bar { opacity: 1; }
        .lkz-progress-bg { width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; }
        .lkz-progress-fill { width: 0%; height: 100%; background: var(--lkz-primary); transition: width 0.2s linear; }
        .lkz-close-btn { display: none; position: absolute; top: 10px; right: 10px; z-index: 1000005; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; font-size: 14px; line-height: 26px; text-align: center; }
        .is-floating .lkz-close-btn { display: block; }
    `;
    document.head.appendChild(style);

    // --- INJECT HTML ---
    const anchor = document.createElement('div');
    anchor.id = "ad-view-anchor";
    anchor.style.cssText = "width:100%; min-height:280px; clear:both;";
    
    const wrapper = document.createElement('div');
    wrapper.id = "ad-wrapper";
    wrapper.className = "lkz-player-container";
    wrapper.innerHTML = `
        <button id="ad-close-btn" class="lkz-close-btn">✕</button>
        <div class="lkz-video-frame">
            <video id="content-video" muted playsinline style="background:#000;"></video>
            <div id="ad-container"></div>
        </div>
        <div id="lkz-controls" class="lkz-control-bar">
            <div id="lkz-progress" class="lkz-progress-bg"><div id="lkz-progress-bar" class="lkz-progress-fill"></div></div>
            <div style="display:flex; justify-content:space-between; align-items:center; color:#fff; font-size:11px; margin-top:8px;">
                <span style="font-weight:bold; opacity:0.8;">Ads Powered by LKZ</span>
                <button id="lkz-mute-btn" style="background:none; border:none; color:#fff; cursor:pointer; font-size:16px;">🔇</button>
            </div>
        </div>
    `;
    anchor.appendChild(wrapper);
    currentScript.parentNode.insertBefore(anchor, currentScript);

    // --- GPT SETUP ---
    window.googletag = window.googletag || {cmd: []};
    googletag.cmd.push(function() {
        googletag.defineSlot(AD_UNIT_PATH, [336, 280], 'ad-container')
                 .addService(googletag.companionAds())
                 .addService(googletag.pubads());
        googletag.companionAds().setRefreshUnfilledSlots(true);
        googletag.pubads().enableVideoAds();
        googletag.enableServices();
    });

    // --- AD LOGIC ---
    function requestAd() {
        if (refreshCount >= MAX_REFRESHES) return closePlayer();
        const request = new google.ima.AdsRequest();
        request.adTagUrl = AD_TAG_BASE + Date.now();
        adsLoader.requestAds(request);
        refreshCount++;
    }

    function initAds() {
        const videoElement = document.getElementById('content-video');
        const adContainer = document.getElementById('ad-container');
        adDisplayContainer = new google.ima.AdDisplayContainer(adContainer, videoElement);
        adDisplayContainer.initialize();
        adsLoader = new google.ima.AdsLoader(adDisplayContainer);

        adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (e) => {
            if (adsManager) adsManager.destroy();
            adsManager = e.getAdsManager(videoElement);
            
            adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
                adsLoader.contentComplete();
                setTimeout(requestAd, 2000);
            });

            adsManager.init(wrapper.offsetWidth, wrapper.offsetHeight, google.ima.ViewMode.NORMAL);
            adsManager.setVolume(0);
            adsManager.start();
            if (!stickyObserver) setupSticky();
        }, false);

        adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, () => {
            googletag.cmd.push(() => { googletag.display('ad-container'); });
            setTimeout(() => {
                if (document.getElementById('ad-container').innerHTML === "") closePlayer();
            }, 3000);
        }, false);

        requestAd();
    }

    function setupSticky() {
        stickyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.intersectionRatio < 0.1) {
                    wrapper.classList.add('is-floating');
                } else {
                    wrapper.classList.remove('is-floating');
                }
                if (adsManager) adsManager.resize(wrapper.offsetWidth, wrapper.offsetHeight, google.ima.ViewMode.NORMAL);
            });
        }, { threshold: [0, 0.1] });
        stickyObserver.observe(anchor);
    }

    function closePlayer() {
        anchor.style.display = 'none';
        if (adsManager) adsManager.destroy();
    }

    const checkReady = setInterval(() => {
        if (window.google && google.ima && window.googletag && googletag.apiReady) {
            clearInterval(checkReady);
            initAds();
        }
    }, 200);

    document.getElementById('ad-close-btn').onclick = closePlayer;
    document.getElementById('lkz-mute-btn').onclick = () => {
        if (!adsManager) return;
        const vol = adsManager.getVolume();
        adsManager.setVolume(vol === 0 ? 1 : 0);
        document.getElementById('lkz-mute-btn').innerText = vol === 0 ? "🔊" : "🔇";
    };
})();
