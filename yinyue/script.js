document.addEventListener('DOMContentLoaded', function () {
    const player = {
        isPlaying: false,
        currentSong: 0,
        songs: []
    };
    const audioPlayer = document.getElementById('audioPlayer');
    const albumArt = document.querySelector('.album-art img');
    const songTitle = document.querySelector('.song-title');
    const songArtist = document.querySelector('.song-artist');
    const durationDisplay = document.querySelector('.duration');
    const currentTimeDisplay = document.querySelector('.current-time');
    const progressBar = document.querySelector('.progress-bar');
    const progress = document.querySelector('.progress');
    const playBtn = document.querySelector('.play-btn');
    const prevBtn = document.querySelector('.fa-backward').parentElement;
    const nextBtn = document.querySelector('.fa-forward').parentElement;
    const playlistToggle = document.querySelector('.playlist-toggle');
    const closePlaylist = document.querySelector('.close-playlist');
    const playlist = document.querySelector('.playlist');
    const dragHandle = document.querySelector('.drag-handle');
    const playlistContainer = document.querySelector('.playlist-container');
    const lyricsContainer = document.querySelector('.lyrics');

    // 从 JSON 文件加载播放列表数据 
    fetch('playlist.json')
       .then(response => response.json())
       .then(data => {
            player.songs = data;

            data.forEach(song => {
                const newItem = createPlaylistItem(song);
                playlist.appendChild(newItem);
            });
            initPlayer();
        })
       .catch(error => {
            console.error('Error fetching playlist:', error);
        });
    audioPlayer.oncanplay = function () {
        if (audioPlayer.duration &&!isNaN(audioPlayer.duration)) {
            durationDisplay.textContent = formatTime(audioPlayer.duration);
        }
    };
    function initPlayer() {
        loadSong(player.currentSong);

        audioPlayer.addEventListener('loadedmetadata', function () {
            durationDisplay.textContent = formatTime(audioPlayer.duration);
            updateProgress();

        });
        audioPlayer.play().catch(error => {
            console.error('自动播放失败:', error);
        });
        function progressUpdater() {
            updateProgress();
            updateLyrics();
            if (player.isPlaying) {
                requestAnimationFrame(progressUpdater);
            }
        }

        audioPlayer.addEventListener('play', function () {
            player.isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            progressUpdater();
        });

        audioPlayer.addEventListener('pause', function () {
            player.isPlaying = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        });

        audioPlayer.addEventListener('ended', function () {
            if (playbackMode === 'loop') {
                audioPlayer.currentTime = 0;
                audioPlayer.play().catch(error => {
                    console.error('单曲循环重播时播放错误:', error);
                });
            } else {
                playNext();
                if (playbackMode ==='sequence' || playbackMode === 'random') {
                    if (!player.isPlaying) {
                        audioPlayer.play().catch(error => {
                            console.error('播放下一首时出错:', error);
                        });
                    }
                }
            }
        });


    }

    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10? '0' + seconds : seconds}`;
    }

    function updateProgress() {
        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration;
        const percent = duration > 0? currentTime / duration : 0;
        progress.style.width = `${percent * 100}%`;
        currentTimeDisplay.textContent = formatTime(currentTime);
        if (currentTime >= duration) {
            progress.style.width = '100%';
        }
    }

    function setProgress(e) {
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        audioPlayer.currentTime = percent * audioPlayer.duration;
        updateProgress();
        updateLyrics();// 新增这一行，在设置进度后更新歌词
    }

    // 修改触摸事件处理
    progressBar.addEventListener('touchstart', function (e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = progressBar.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const percent = x / rect.width;
        audioPlayer.currentTime = percent * audioPlayer.duration;
        updateProgress();
        updateLyrics();

        // 确保音频在设置进度后处于播放状态
        if (player.isPlaying && audioPlayer.paused) {
            audioPlayer.play().catch(error => {
                console.error('重新播放音频时出错：', error);
            });
        }
    });

    progressBar.addEventListener('touchmove', function (e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = progressBar.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const percent = x / rect.width;
        audioPlayer.currentTime = percent * audioPlayer.duration;
        updateProgress();
        updateLyrics();

        // 确保音频在设置进度后处于播放状态
        if (player.isPlaying && audioPlayer.paused) {
            audioPlayer.play().catch(error => {
                console.error('重新播放音频时出错：', error);
            });
        }
    });

    progressBar.addEventListener('touchend', function (e) {
        e.preventDefault();
    });

    function loadSong(index) {
        const song = player.songs[index];
        albumArt.src = song.cover;
        songTitle.textContent = song.title;
        songArtist.textContent = song.artist;
        durationDisplay.textContent = song.duration;
        audioPlayer.src = song.audioSrc;
        const playlistItems = playlist.querySelectorAll('.playlist-item');
        playlistItems.forEach(item => item.classList.remove('active'));
        playlistItems[index].classList.add('active');
        playlistItems[index].scrollIntoView({
            behavior:'smooth',
            block: 'center'
        });

        // 从单独的歌词文件加载歌词
        const lyricsFileName = song.lyricSrc;
        loadLyrics(lyricsFileName).then(lyricsData => {
            displayLyrics(lyricsData);
        }).catch(error => {
            console.error('Error loading lyrics:', error);
            // 加载歌词失败时，设置为空数组
            displayLyrics([]);
        });
    }

    function createPlaylistItem(song) {
        const item = document.createElement('div');
        item.classList.add('playlist-item');
        item.innerHTML = `
            <div class="playlist-item-img">
                <img src="${song.cover}" alt="Song Cover">
            </div>
            <div class="playlist-item-info">
                <div class="playlist-item-title">${song.title}</div>
                <div class="playlist-item-artist">${song.artist}</div>
            </div>
            <div class="playlist-item-duration">${song.duration}</div>
        `;
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const index = Array.from(playlist.children).indexOf(this);
            player.currentSong = index;
            if (player.isPlaying) {
                // 先暂停当前播放的歌曲
                togglePlay();
            }

            loadSong(index);
            // 播放新的歌曲
            togglePlay();
        });
        return item;
    }

    function togglePlay() {
        if (player.isPlaying) {
            audioPlayer.pause();
            player.isPlaying = false;
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            audioPlayer.play()
               .then(() => {
                    player.isPlaying = true;
                    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                })
               .catch(error => {
                    console.error('音频播放错误:', error);
                    player.isPlaying = false;
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                });
        }
    }

    function playNext() {
        if (playbackMode === 'random') {
            const randomIndex = Math.floor(Math.random() * player.songs.length);
            player.currentSong = randomIndex;
        } else if (playbackMode === 'loop') {
            return;
        } else {
            player.currentSong++;
            if (player.currentSong >= player.songs.length) {
                player.currentSong = 0;
            }
        }
        loadSong(player.currentSong);
        audioPlayer.currentTime = 0;
        // 如果当前处于播放状态，切换歌曲后继续播放
        if (player.isPlaying) {
            audioPlayer.play().catch(error => {
                console.error('切换歌曲后播放出错:', error);
            });
        }
    }

    function playPrev() {
        if (playbackMode === 'random') {
            const randomIndex = Math.floor(Math.random() * player.songs.length);
            player.currentSong = randomIndex;
        } else if (playbackMode === 'loop') {
            return;
        } else {
            player.currentSong--;
            if (player.currentSong < 0) {
                player.currentSong = player.songs.length - 1;
            }
        }
        loadSong(player.currentSong);
        audioPlayer.currentTime = 0;
        if (player.isPlaying) {
            audioPlayer.play();
        }
    }

    function togglePlaylist() {
        const playlistContainer = document.querySelector('.playlist-container');
        const icon = playlistToggle.querySelector('i');
        if (playlistContainer.classList.contains('show')) {
            playlistContainer.classList.remove('show');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        } else {
            playlistContainer.classList.add('show');
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        }
    }

    let startY, startHeight;
    function dragStart(e) {
        startY = e.clientY || e.touches[0].clientY;
        startHeight = parseInt(window.getComputedStyle(playlistContainer).height, 10);
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('touchmove', dragMove);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);
    }

    function dragMove(e) {
        const y = e.clientY || e.touches[0].clientY;
        const dy = startY - y;
        const newHeight = startHeight + dy;

        if (newHeight > window.innerHeight * 0.3 && newHeight < window.innerHeight * 0.9) {
            playlistContainer.style.height = `${newHeight}px`;
        }
    }

    function dragEnd() {
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('touchmove', dragMove);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchend', dragEnd);
    }

    function loadLyrics(lyricsFileName) {
        const fullPath = `lrc/${lyricsFileName}`;
        return fetch(fullPath)
           .then(response => {
                if (!response.ok) {
                    throw new Error('歌词文件请求失败，状态码：' + response.status);
                }
                return response.text();
            })
           .then(text => {
                const lines = text.split('\n');
                const lyricsData = [];
                lines.forEach(line => {
                    const match = line.match(/\[\d{2}:\d{2}(\.\d+)?\](.*)/);
                    if (match) {
                        const timeStr = match[1]? match[0].slice(1, -1) : match[0].slice(1, -1) + '.00';
                        const timeParts = timeStr.split(':');
                        const minutes = parseInt(timeParts[0], 10);
                        const seconds = parseFloat(timeParts[1]);
                        const time = minutes * 60 + seconds;
                        const text = match[2];
                        lyricsData.push({ time: Math.round(time * 100) / 100, text });
                    }
                });
                return lyricsData;
            })
           .catch(error => {
                console.error('加载歌词文件时出错:', error);
                return []; // 返回空数组，避免后续因未定义歌词数据导致的错误
            });
    }

    function displayLyrics(lyricsData) {
        if (lyricsData.length === 0) {
            // 如果歌词数据为空，显示“纯音乐”
            lyricsContainer.innerHTML = '<p>纯音乐</p>';
        } else {
            const lyricsHTML = lyricsData.map(lyric => `<p data-time="${lyric.time}">${lyric.text}</p>`).join('');
            lyricsContainer.innerHTML = lyricsHTML;
        }
    }

    let lastActiveLyricIndex = -1; // 记录上一次活跃的歌词索引，避免重复滚动 
    let isLyricsScrolling = false; // 新增标志变量，用于控制歌词是否开始滚动

    function updateLyrics() {
        const currentTime = Math.round(audioPlayer.currentTime * 100) / 100;
        const lyricsElements = lyricsContainer.querySelectorAll('p');
        let activeLyricIndex = -1;

        // 找到当前时间对应的歌词行 
        for (let i = 0; i < lyricsElements.length; i++) {
            const lyricTime = parseFloat(lyricsElements[i].dataset.time);
            const nextLyricTime = i < lyricsElements.length - 1?
                parseFloat(lyricsElements[i + 1].dataset.time) : Infinity;

            if (currentTime >= lyricTime && currentTime < nextLyricTime) {
                activeLyricIndex = i;
                break;
            }
        }

        // 2. 如果当前活跃歌词未变化，则直接返回，避免不必要的操作 
        if (activeLyricIndex === lastActiveLyricIndex) {
            return;
        }
        lastActiveLyricIndex = activeLyricIndex;

        // 更新歌词样式 
        lyricsElements.forEach((lyric, index) => {
            lyric.style.color = index === activeLyricIndex?
                'var(--text-primary)' : 'var(--text-secondary)';
            lyric.style.fontWeight = index === activeLyricIndex? 'bold' : 'normal';
        });

        // 平滑滚动到当前歌词
        if (activeLyricIndex > -1) {
            const activeLyric = lyricsElements[activeLyricIndex];
            // 调整参数
            activeLyric.scrollIntoView({ behavior:'smooth', block: 'nearest' });
        }
    }

    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    // 实时匹配函数
    function liveMatch() {
        const searchTerm = searchInput.value.toLowerCase();
        const playlistItems = playlist.querySelectorAll('.playlist-item');
        playlistItems.forEach(item => {
            const title = item.querySelector('.playlist-item-title').textContent.toLowerCase();
            const artist = item.querySelector('.playlist-item-artist').textContent.toLowerCase();
            if (title.includes(searchTerm) || artist.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // 监听输入框的 input 事件，实现实时匹配
    searchInput.addEventListener('input', liveMatch);

    // 保留原有的点击搜索按钮的事件监听（可按需决定是否保留）
    searchButton.addEventListener('click', function () {
        liveMatch();
    });

    // 监听音频的时间更新事件，实时更新歌词
    audioPlayer.addEventListener('timeupdate', function () {
        updateLyrics();
    });

    // 事件监听 
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrev);
    nextBtn.addEventListener('click', playNext);
    progressBar.addEventListener('click', setProgress);
    progressBar.addEventListener('touchstart', function (e) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.dispatchEvent(mouseEvent);
    });
    playlistToggle.addEventListener('click', togglePlaylist);
    closePlaylist.addEventListener('click', togglePlaylist);
    dragHandle.addEventListener('mousedown', dragStart);
    dragHandle.addEventListener('touchstart', dragStart);
    playlist.addEventListener('touchmove', function (e) {
        e.stopPropagation();
    }, { passive: false });

    // 定义初始播放模式为顺序播放
    let playbackMode ='sequence';
    const playbackModeToggleBtn = document.getElementById('playback-mode-toggle');

    // 确保按钮元素正确获取
    if (!playbackModeToggleBtn) {
        console.error('未获取到播放模式切换按钮元素');
    } else {
        // 为按钮添加点击事件监听器
        playbackModeToggleBtn.addEventListener('click', function () {
            switch (playbackMode) {
                case'sequence':
                    playbackMode = 'random';
                    playbackModeToggleBtn.innerHTML = '<i class="fas fa-random"></i>';
                    break;
                case 'random':
                    playbackMode = 'loop';
                    playbackModeToggleBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
                    break;
                case 'loop':
                    playbackMode =
'sequence';
                    playbackModeToggleBtn.innerHTML = '<i class="fas fa-list-alt"></i>';
                    break;
            }
            console.log('当前播放模式已切换为:', playbackMode);
        });
    }
});
