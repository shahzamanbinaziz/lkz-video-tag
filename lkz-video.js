(function() {
    // 1. CONFIGURATION
    var AD_TAG_URL = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21614972100/lkz-irfan-video&description_url=' + encodeURIComponent(window.location.href) + '&sz=400x300|640x480&gdfp_req=1&unviewed_position_start=1&output=vast&env=vp&impl=s&correlator=' + Date.now();
    var ADX_CLIENT = "ca-pub-1595639729766067";
    var ADX_SLOT = "lkz-comparehub-child";

    // 2. INJECT CSS
    var style = document.createElement('style');
    style.innerHTML = `
        :root { --lkz-primary: #00FF00; }
        .lkz-player-container { width: 100%; max-width: 640px; background: #000; position: relative; margin: 20px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #333; line-height: 0; }
        .lkz-video-frame { width: 100%; aspect-ratio: 16/9; position: relative; }
        #content-video, #ad-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
        .is-floating { position: fixed !important; bottom: 20px !important; right: 20px !important; width: 320px !important; max-width: 90vw !important; z-index: 1000000 !important; backdrop-filter: blur(10px); background: rgba(0, 0, 0, 0.8) !important; border: 1px solid #444; line-height: normal; }
        .lkz-control-bar { position: absolute; bottom: 0; left: 0; width: 100%; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 10px; box-sizing: border-box; z-index: 1000001; opacity: 0; transition: opacity 0.3s; }
        .lkz-player-container:hover .lkz-control-bar { opacity: 1; }
        .lkz-progress-bg { width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin-bottom: 8px; }
        .lkz-progress-fill { width: 0%; height: 100%; background: var(--lkz-primary); border-radius: 2px; transition: width 0.2s linear; }
        .lkz-bottom-row { display: flex; justify-content: space-between; align-items: center; line-height: 1; }
        .lkz-brand { color: #fff; font-family: sans-serif; font-size: 11px; font-weight: bold; opacity: 0.8; margin: 0; }
        .lkz-icon-btn { background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0; outline: none; }
        .lkz-close-btn { display: none; position: absolute; top: 10px; right: 10px; z-index: 1000005; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; font-size: 14px; line-height: 26px; text-align: center; }
        .is-floating .lkz-close-btn { display: block; }
        @media only screen and (max-width: 480px) { .is-floating { width: 240px !important; } }
    `;
    document.head.appendChild(style);

    // 3. INJECT HTML STRUCTURE
    var currentScript = document.currentScript;
    var anchor = document.createElement('div');
    anchor.id = "ad-view-anchor";
    anchor.style.cssText = "width:100%; min-height:280px; clear:both;";
    
    var wrapper = document.createElement('div');
    wrapper.id = "ad-wrapper";
    wrapper.className = "lkz-player-container";
    wrapper.innerHTML = `
        <button id="ad-close-btn" class="lkz-close-btn">✕</button>
        <div class="lkz-video-frame">
            <video id="content-video" muted playsinline></video>
            <div id="ad-container"></div>
        </div>
        <div id="lkz-controls" class="lkz-control-bar">
            <div id="lkz-progress" class="lkz-progress-bg">
                <div id="lkz-progress-bar" class="lkz-progress-fill"></div>
            </div>
            <div class="lkz-bottom-row">
                <div class="lkz-brand">Ads Powered by LKZ</div>
                <div class="lkz-actions">
                    <button id="lkz-mute-btn" class="lkz-icon-btn"><span id="mute-icon">🔇</span></button>
                </div>
            </div>
        </div>
    `;
    anchor.appendChild(wrapper);
    currentScript.parentNode.insertBefore(anchor, currentScript);

    // 4. LOAD EXTERNAL LIBRARIES
    function loadScript(src, callback) {
        var s = document.createElement('script');
        s.src = src; s.onload = callback;
        document.head.appendChild(s);
    }

    var adsManager, adsLoader, stickyObserver, progressInterval;
    var hasSwapped = false;

    loadScript("https://imasdk.googleapis.com/js/sdkloader/ima3.js", function() {
        var checkIMA = setInterval(function() {
            if (window.google && google.ima) { clearInterval(checkIMA); startAdLogic(); }
        }, 200);
    });

    // 5. CORE AD LOGIC
    function startAdLogic() {
        var videoElement = document.getElementById('content-video');
        var adContainer = document.getElementById('ad-container');
        var adDisplayContainer = new google.ima.AdDisplayContainer(adContainer, videoElement);
        adDisplayContainer.initialize();

        adsLoader = new google.ima.AdsLoader(adDisplayContainer);
        adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsLoaded, false);
        adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, function() { if(!hasSwapped) loadAdXFallback(); }, false);

        var request = new google.ima.AdsRequest();
        request.adTagUrl = AD_TAG_URL;
        request.setAdWillAutoPlay(true);
        request.setAdWillPlayMuted(true);
        adsLoader.requestAds(request);

        document.getElementById('ad-close-btn').onclick = closeAdPermanently;
        document.getElementById('lkz-mute-btn').onclick = toggleMute;
    }

    function onAdsLoaded(e) {
        adsManager = e.getAdsManager(document.getElementById('content-video'));
        adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, function(){ setTimeout(closeAdPermanently, 2000); });
        
        progressInterval = setInterval(function() {
            if (adsManager) {
                try {
                    var ad = adsManager.getCurrentAd();
                    if (ad && ad.getDuration() > 0) {
                        var progress = ((ad.getDuration() - adsManager.getRemainingTime()) / ad.getDuration()) * 100;
                        document.getElementById('lkz-progress-bar').style.width = Math.min(progress, 100) + "%";
                    }
                } catch(err){}
            }
        }, 200);

        adsManager.init(wrapper.offsetWidth, wrapper.offsetHeight, google.ima.ViewMode.NORMAL);
        adsManager.setVolume(0);
        adsManager.start();
        setupSticky();
    }

    function setupSticky() {
        stickyObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (hasSwapped) return;
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

    function loadAdXFallback() {
        hasSwapped = true;
        clearInterval(progressInterval);
        if (stickyObserver) stickyObserver.disconnect();
        wrapper.className = "";
        wrapper.style.cssText = "width:336px; height:280px; margin:10px auto; background:#fff; display:flex; align-items:center; justify-content:center; position:relative;";
        wrapper.innerHTML = `<ins class="adsbygoogle" style="display:inline-block;width:336px;height:280px" data-ad-client="${ADX_CLIENT}" data-ad-slot="${ADX_SLOT}" data-tag-src="gamtg"></ins>`;
        
        loadScript("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADX_CLIENT, function() {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        });
    }

    function toggleMute() {
        if (adsManager) {
            var vol = adsManager.getVolume();
            adsManager.setVolume(vol === 0 ? 1 : 0);
            if (vol === 0) adsManager.resume();
            document.getElementById('mute-icon').innerText = vol === 0 ? "🔊" : "🔇";
        }
    }

    function closeAdPermanently() {
        clearInterval(progressInterval);
        anchor.style.display = 'none';
        if (adsManager) { try { adsManager.destroy(); } catch(e){} }
    }
})();
