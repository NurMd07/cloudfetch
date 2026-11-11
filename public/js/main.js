const downloadButton = document.getElementById('downloadButton');
const urlInput = document.getElementById('urlInput');
const statusElement = document.getElementById('status');
const loader = document.querySelector('.loader');
const nameInput = document.getElementById('nameInput');
const resetButton = document.querySelector('.reset');
const resetButton1 = document.querySelector('.reset-phone');
const deleteOne = document.querySelector('.deleteone');
const deleteAll = document.querySelector('.deleteall');

const sidebarHeaderMenu = document.querySelector('.side-check');
const sidebarHeaderMenuButton = sidebarHeaderMenu.closest('.sidebar-header-menu');
const itemList = document.querySelector('.sidebar-list');
const clearData = document.querySelector('.cleardata');
const moveData = document.querySelector('.movedata');
const clearLog = document.querySelector('.clearlog');
const logContent = document.querySelector('.log-content');
const logEmpty = document.querySelector('.log-empty');
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main');
const moreOptions = document.querySelector('.more-options');
const moviesLabel = document.querySelector('label[for="movies"]');
const seriesLabel = document.querySelector('label[for="tv-series"]');
const animeLabel = document.querySelector('label[for="anime"]');
const moreOptionsIcon = document.querySelector('.more-options svg');
const moreOptionsIconLeft = document.querySelector('.more-options svg:nth-child(2)');
const removeRecent = document.querySelector('.removerecent');
const logSwitcher = document.querySelector('.log-switcher');
const logContainer = document.querySelector('.options-log');
const optionsContainer = document.querySelector('.options-menu');
const listOutput = document.querySelector('.listoutput');
const modeGdrive = document.querySelector('.mode-gdrive');
const modeSiteDL = document.querySelector('.mode-siteDL');
const modeMagnet = document.querySelector('.mode-magnet');
const headingGdriveSvg = document.querySelector('h1 svg');
const headingMagnetSvg = document.querySelector('h1 svg:nth-child(2)');
const headingSiteDLSvg = document.querySelector('h1 svg:nth-child(3)');
const pageHeading = document.querySelector('main h1');
const infoButton = document.querySelector('.info');
const infoContentContainer = document.querySelector('.infoContent-container');
const infoContent = document.querySelector('.infoContent');
const closeInfoContent = document.querySelector('.closeInfoContent');
const logout = document.querySelector('.logout');
const confirmationOverlay = document.querySelector('.confirmation-overlay');
const confirmationTitle = document.querySelector('#confirmation-title');
const confirmationMessage = document.querySelector('#confirmation-message');
const confirmationCancel = document.querySelector('.confirmation-cancel');
const confirmationAccept = document.querySelector('.confirmation-accept');

sidebarHeaderMenu.checked = localStorage.getItem('cloudfetch-active-view') === 'options';

function requestConfirmation({ title, message, confirmLabel, danger = false }) {
	const previousFocus = document.activeElement;
	confirmationTitle.textContent = title;
	confirmationMessage.textContent = message;
	confirmationAccept.textContent = confirmLabel;
	confirmationAccept.classList.toggle('danger', danger);
	confirmationOverlay.classList.remove('hidden');
	confirmationCancel.focus();

	return new Promise(resolve => {
		function close(confirmed) {
			confirmationOverlay.classList.add('hidden');
			confirmationOverlay.removeEventListener('click', onOverlayClick);
			confirmationCancel.removeEventListener('click', onCancel);
			confirmationAccept.removeEventListener('click', onAccept);
			document.removeEventListener('keydown', onKeydown);
			previousFocus.focus();
			resolve(confirmed);
		}

		function onOverlayClick(event) {
			if (event.target === confirmationOverlay) {
				close(false);
			}
		}

		function onCancel() {
			close(false);
		}

		function onAccept() {
			close(true);
		}

		function onKeydown(event) {
			if (event.key === 'Escape') {
				event.preventDefault();
				close(false);
			} else if (event.key === 'Tab') {
				const focusedCancel = document.activeElement === confirmationCancel;
				const focusedAccept = document.activeElement === confirmationAccept;

				if (event.shiftKey && focusedCancel) {
					event.preventDefault();
					confirmationAccept.focus();
				} else if (!event.shiftKey && focusedAccept) {
					event.preventDefault();
					confirmationCancel.focus();
				}
			}
		}

		confirmationOverlay.addEventListener('click', onOverlayClick);
		confirmationCancel.addEventListener('click', onCancel);
		confirmationAccept.addEventListener('click', onAccept);
		document.addEventListener('keydown', onKeydown);
	});
}

pageHeading.addEventListener('click', () => {
	pageHeading.classList.add('clicked');
	window.setTimeout(() => window.location.reload(), 160);
});

logout.addEventListener('click', async () => {
	if (!await requestConfirmation({
		title: 'Log out?',
		message: 'Are you sure you want to log out?',
		confirmLabel: 'Log out'
	})) {
		return;
	}

	const res = await fetch("/logout", {
		method: "POST"
	});

	if (res.redirected) {
		window.location.href = res.url;
	} else if (res.ok) {
		window.location.href = "/login";
	}
})

infoButton.addEventListener('click', () => {
	infoContentContainer.classList.toggle('hidden');
	mainContent.classList.toggle('blurred');
	sidebar.classList.toggle('blurred');
	optionsContainer.classList.toggle('blurred');
});

window.addEventListener('click', (event) => {
	if ((event.target === infoContentContainer || closeInfoContent.contains(event.target)) && !infoButton.contains(event.target)) {
		infoContentContainer.classList.add('hidden');
		mainContent.classList.remove('blurred');
		sidebar.classList.remove('blurred');
		optionsContainer.classList.remove('blurred');
	}
});

if (localStorage.getItem('mode')) {
	setMode(localStorage.getItem('mode'));
} else {
	setMode('gdrive');
	localStorage.setItem('mode', 'gdrive');
}

function setMode(mode) {
	const title = document.querySelector('.title');
	const urlInput = document.getElementById('urlInput');
	const urlLabel = document.querySelector('label[for="urlInput"]');


	const modeGdriveSvg1 = modeGdrive.querySelector('svg');
	const modeGdriveSvg2 = modeGdrive.querySelector('svg:nth-child(2)');
	const modeSiteDLSvg1 = modeSiteDL.querySelector('svg');
	const modeSiteDLSvg2 = modeSiteDL.querySelector('svg:nth-child(2)');
	const modeMagnetSvg1 = modeMagnet.querySelector('svg');
	const modeMagnetSvg2 = modeMagnet.querySelector('svg:nth-child(2)');

	if (mode === 'gdrive') {
		title.innerHTML = `CloudFetch <span class="sub-title">Google Drive DL (mode)</span>`;
		urlLabel.textContent = 'Google Drive URL:';
		urlInput.placeholder = 'Enter Google Drive URL';

		headingGdriveSvg.classList.remove('hidden');
		headingMagnetSvg.classList.add('hidden');
		headingSiteDLSvg.classList.add('hidden');

		modeGdrive.classList.add('selected');
		modeSiteDL.classList.remove('selected');
		modeMagnet.classList.remove('selected');
		modeGdriveSvg1.classList.add('hidden');
		modeGdriveSvg2.classList.remove('hidden');
		modeSiteDLSvg1.classList.remove('hidden');
		modeSiteDLSvg2.classList.add('hidden');
		modeMagnetSvg1.classList.remove('hidden');
		modeMagnetSvg2.classList.add('hidden');

	} else if (mode === 'siteDL') {
		title.innerHTML = `CloudFetch <span class="sub-title">Direct Download DL (mode)</span>`;
		urlLabel.textContent = 'Direct URL:';
		urlInput.placeholder = 'Enter direct Download URL';

		headingGdriveSvg.classList.add('hidden');
		headingMagnetSvg.classList.add('hidden');
		headingSiteDLSvg.classList.remove('hidden');

		modeGdrive.classList.remove('selected');
		modeSiteDL.classList.add('selected');
		modeMagnet.classList.remove('selected');
		modeGdriveSvg1.classList.remove('hidden');
		modeGdriveSvg2.classList.add('hidden');
		modeSiteDLSvg1.classList.add('hidden');
		modeSiteDLSvg2.classList.remove('hidden');
		modeMagnetSvg1.classList.remove('hidden');
		modeMagnetSvg2.classList.add('hidden');

	} else if (mode === 'magnet') {
		title.innerHTML = `CloudFetch <span class="sub-title">Torrent DL (mode)</span>`;
		urlLabel.textContent = 'Magnet Link:';
		urlInput.placeholder = 'Enter Magnet Link';

		headingGdriveSvg.classList.add('hidden');
		headingMagnetSvg.classList.remove('hidden');
		headingSiteDLSvg.classList.add('hidden');

		modeGdrive.classList.remove('selected');
		modeSiteDL.classList.remove('selected');
		modeMagnet.classList.add('selected');
		modeGdriveSvg1.classList.remove('hidden');
		modeGdriveSvg2.classList.add('hidden');
		modeSiteDLSvg1.classList.remove('hidden');
		modeSiteDLSvg2.classList.add('hidden');
		modeMagnetSvg1.classList.add('hidden');
		modeMagnetSvg2.classList.remove('hidden');
	}

}


modeGdrive.addEventListener('click', () => {
	setMode('gdrive');
	localStorage.setItem('mode', 'gdrive');
	sidebarHeaderMenu.click();
});


modeSiteDL.addEventListener('click', () => {
	setMode('siteDL');
	localStorage.setItem('mode', 'siteDL');
	sidebarHeaderMenu.click();
});

modeMagnet.addEventListener('click', () => {
	setMode('magnet');
	localStorage.setItem('mode', 'magnet');
	sidebarHeaderMenu.click();
});

listOutput.addEventListener('click', async function () {

	fetch('/listDir', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	}).then(response => response.json())
		.then(data => {
			if (data.error) {
				statusElement.textContent = data.error;
				sidebarHeaderMenu.click();
			} else {
				if (window.innerWidth < 768) {
					logContainer.classList.toggle('show');
					optionsContainer.classList.toggle('hide');
					logSwitcher.classList.toggle('active', logContainer.classList.contains('show'));
				}

			}

		}).catch(error => {
			statusElement.innerHTML = 'An error occurred. Please try again.';
			sidebarHeaderMenu.click();
		})


})

logSwitcher.addEventListener('click', function () {

	logContainer.classList.toggle('show');

	optionsContainer.classList.toggle('hide');
	logSwitcher.classList.toggle('active', logContainer.classList.contains('show'));

});

sidebarHeaderMenu.addEventListener('change', function () {
	localStorage.setItem('cloudfetch-active-view', sidebarHeaderMenu.checked ? 'options' : 'main');

	if (window.innerWidth < 768) {
		logContainer.classList.remove('show');
		optionsContainer.classList.remove('hide');
		logSwitcher.classList.remove('active');
	}
});

sidebarHeaderMenu.addEventListener('click', function (event) {
	if (event.isTrusted) {
		sidebarHeaderMenuButton.classList.remove('download-attention');
	}
});



removeRecent.addEventListener('click', async function () {
	if (!await requestConfirmation({
		title: 'Remove recent item?',
		message: 'The most recent item will be deleted from the output directory and its source file. If it was moved, its matching copy under /media/* will also be deleted. It will also be removed from download history.',
		confirmLabel: 'Remove item',
		danger: true
	})) {
		return;
	}

	fetch('/removeRecent', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	}).then(response => response.json())
		.then(data => {
			if (data.error) {
				statusElement.textContent = data.error;
			} else {
				statusElement.innerHTML = ' ✓&nbsp;&nbsp;Recent item removed successfully';
			}
			fetchItems();
		}).catch(error => {
			statusElement.innerHTML = 'An error occurred. Please try again.';
			fetchItems();
		})
});
moreOptions.addEventListener('click', () => {

	moreOptionsIcon.classList.toggle('hidden');
	moreOptionsIconLeft.classList.toggle('hidden');

	seriesLabel.classList.toggle('hidden');
	moviesLabel.classList.toggle('hidden');

	animeLabel.classList.toggle('hidden');
});


let scrollTimeout;
let isFirstScroll = true;


sidebar.addEventListener('scroll', () => {

	if (sidebar.scrollTop > 0 && !sidebar.classList.contains('expanded')) {
		sidebar.classList.add('expanded');

		isFirstScroll = true;
	} else if (sidebar.scrollTop === 0 && sidebar.classList.contains('expanded') && !isFirstScroll) {
		sidebar.classList.remove('expanded');
		isFirstScroll = false;
	}

});

let touchStartY = 0;

sidebar.addEventListener('touchstart', (e) => {
	touchStartY = e.touches[0].clientY;
}, { passive: true });

sidebar.addEventListener('touchmove', (e) => {
	const currentY = e.touches[0].clientY;
	const deltaY = currentY - touchStartY;

	if (
		sidebar.classList.contains('expanded') &&
		sidebar.scrollTop === 0 &&
		deltaY > 1
	) {
		e.preventDefault();
	}
}, { passive: false });



sidebar.addEventListener('touchend', (e) => {
	const deltaY = e.changedTouches[0].clientY - touchStartY;

	if (
		sidebar.classList.contains('expanded') &&
		sidebar.scrollTop === 0 &&
		deltaY > 50
	) {
		sidebar.classList.remove('expanded');
		isFirstScroll = false;
	}
}, { passive: true });

let clearState = false;

function updateItemList(items) {
	if (items.length === 0) {
		const emptyState = document.createElement('li');
		emptyState.classList.add('history-empty');
		emptyState.textContent = 'No download history yet';
		itemList.appendChild(emptyState);
		return;
	}

	[...items].sort((a, b) => b.id - a.id).forEach(item => {
		const li = document.createElement('li');
		li.classList.add('item');
		const itemId = document.createElement('span');
		itemId.classList.add('item-id');
		itemId.textContent = item.id;
		li.appendChild(itemId);

		const timestamp = new Date(item.timestamp).toLocaleString("en-US", {
			day: "2-digit",
			month: "short",
			hour: "numeric",
			minute: "2-digit",
			hour12: true
		});
		const outputPath = item.output_path
			? `~/output/${item.output_path.split('/output/')[1] ?? item.output_path}`
			: '~/output/';
		const sourcePath = item.source_path
			? `~/output/${item.source_path.split('/output/')[1] ?? item.source_path}`
			: '~/output/';

		appendItemField(li, 'item-name', '📛 Name:', item.name);
		appendItemField(li, 'item-category', '🎬 Category:', item.category);
		appendItemField(li, 'item-timestamp', '⌚ Added on:', timestamp);
		appendItemField(li, 'item-status', '📥 Status:', String(item.status ?? '').toUpperCase());
		appendItemField(li, 'item-url', '🔗 URL:', item.url);
		appendItemField(li, 'item-output-path', '📂 Output Path:', outputPath);
		appendItemField(li, 'item-source-path', '🗂️ Source Path:', sourcePath);

		itemList.appendChild(li);
	});
}

function appendItemField(itemElement, fieldClass, label, value) {
	const field = document.createElement('span');
	field.classList.add(fieldClass);
	field.append(document.createTextNode(`${label} `));

	const fieldValue = document.createElement('span');
	fieldValue.classList.add('item-field-value');
	fieldValue.textContent = value ?? '';
	field.appendChild(fieldValue);
	itemElement.appendChild(field);
}

function fetchItems() {
	fetch('/items', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(response => {
			if (!response.ok) {
				throw new Error(`Failed to fetch items (${response.status})`);
			}
			return response.json();
		})
		.then(data => {
			if (!Array.isArray(data)) {
				throw new TypeError('Expected item list response to be an array');
			}
			itemList.replaceChildren();
			updateItemList(data);

		}).catch(error => {
			console.error('Error fetching items:', error);
		});

}


const storageInfoContainer = document.querySelector('.storageinfo');

function fetchStorageInfo() {
	fetch('/getStorageInfo', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(response => {
			if (!response.ok) {
				throw new Error(`Failed to fetch storage info (${response.status})`);
			}
			return response.json();
		})
		.then(data => {
			if (!Array.isArray(data)) {
				throw new TypeError('Expected storage info response to be an array');
			}
			storageInfoContainer.replaceChildren();
			data.forEach(disk => {


				const storage = document.createElement('div');
				storage.classList.add('storage');

				const storageName = document.createElement('span');
				storageName.classList.add('storage-name');

				const mountName = disk.mount.split('/').pop();
				storageName.textContent = mountName || "Root";

				storage.appendChild(storageName);

				const storagePath = document.createElement('span');
				storagePath.classList.add('storage-path');
				const storageIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				storageIcon.setAttribute('viewBox', '0 0 16 16');
				storageIcon.setAttribute('width', '16');
				storageIcon.setAttribute('height', '16');
				storageIcon.setAttribute('fill', 'currentColor');
				storageIcon.setAttribute('aria-hidden', 'true');
				const storageIconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				storageIconPath.setAttribute('d', 'M0 10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m2 0a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M.91 7.204A3 3 0 0 1 2 7h12c.384 0 .752.072 1.09.204l-1.867-3.422A1.5 1.5 0 0 0 11.906 3H4.094a1.5 1.5 0 0 0-1.317.782z');
				storageIcon.appendChild(storageIconPath);
				storagePath.append(storageIcon, document.createTextNode(` ${disk.mount}`));

				storage.appendChild(storagePath);

				const storageProgress = document.createElement('div');
				storageProgress.classList.add('storage-progress');
				const progressBar = document.createElement('progress');
				progressBar.max = 100;
				progressBar.value = disk.usagePercent;
				storageProgress.appendChild(progressBar);

				storage.appendChild(storageProgress);

				const storageSubinfo = document.createElement('div');
				storageSubinfo.classList.add('storage-subinfo');
				const storageUsagePercentage = document.createElement('span');
				storageUsagePercentage.classList.add('storage-usage-percentage');
				const storageUsage = document.createElement('span');
				storageUsage.classList.add('storage-usage');
				storageUsagePercentage.textContent = `${disk.usagePercent.toFixed(2)}%`;
				storageUsage.textContent = `${disk.usedGB.toFixed(2)} GB / ${disk.totalGB.toFixed(2)} GB`;
				storageSubinfo.appendChild(storageUsagePercentage);
				storageSubinfo.appendChild(storageUsage);
				storage.appendChild(storageSubinfo);

				storageInfoContainer.appendChild(storage);
			});
		}).catch(error => {
			console.error('Error fetching storage info:', error);
		});
}

fetchItems();
fetchStorageInfo();

window.setInterval(fetchItems, 15000);
window.setInterval(fetchStorageInfo, 30000); // Fetch storage info every 30 seconds	

function waitForItemClick() {
	return new Promise((resolve) => {
		function finish(value) {
			window.removeEventListener("click", handleClick);
			resolve(value);
		}

		function handleClick(e) {
			const target = e.target instanceof Element ? e.target : null;

			if (!clearState) {
				finish(null);
				return;
			}

			const item = target?.closest(".item");
			if (!item) {

				if (target?.classList.contains("side-check")) {
					finish(null);
					return;
				}

				e.stopPropagation();
				e.preventDefault();
				return;

			}

			finish(item.querySelector(".item-id").textContent.trim());
		}

		window.addEventListener("click", handleClick);
	});
}

deleteOne.addEventListener('click', async function () {

	clearState = !clearState;
	if (!clearState) {
		statusElement.innerHTML = ' ';
		deleteOne.classList.remove('deleteone-active');
		deleteAll.classList.remove("disabled");
		clearLog.classList.remove("disabled");
		clearData.classList.remove("disabled");
		moveData.classList.remove("disabled");

		return;
	}
	deleteAll.classList.add("disabled");
	clearLog.classList.add("disabled");
	deleteOne.classList.add('deleteone-active');
	clearData.classList.add("disabled");
	moveData.classList.add("disabled");

	const value = await waitForItemClick();

	clearState = false;

	deleteAll.classList.remove("disabled");
	clearLog.classList.remove("disabled");
	deleteOne.classList.remove('deleteone-active');
	clearData.classList.remove("disabled");
	moveData.classList.remove("disabled");



	if (!value) {
		clearState = false;
		return;
	}

	fetch('/deleteOne', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ id: parseInt(value, 10) })
	})
		.then(response => response.json())

		.then(data => {
			fetchItems();
			if (data.error) {
				statusElement.textContent = data.error;
			} else {
				statusElement.innerHTML = ' ✓&nbsp;&nbsp;File deleted successfully';
				sidebarHeaderMenu.click();
			}
		}).catch(error => {
			fetchItems();
			statusElement.innerHTML = 'An error occurred. Please try again.';
		})

});

deleteAll.addEventListener('click', function () {

	fetch('/deleteAll', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				statusElement.textContent = data.error;
			} else {
				statusElement.innerHTML = ' ✓&nbsp;&nbsp;All files deleted successfully';
			}
			fetchItems();
		}).catch(error => {
			statusElement.innerHTML = 'An error occurred. Please try again.';
			fetchItems();
		})

	sidebarHeaderMenu.click();
});


clearData.addEventListener('click', async function () {
	if (!await requestConfirmation({
		title: 'Delete app data?',
		message: 'This will permanently delete files in the output directory and clear download history. This cannot be undone.',
		confirmLabel: 'Delete data',
		danger: true
	})) {
		return;
	}

	fetch('/clearData', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				statusElement.textContent = data.error;
				return;
			}
			statusElement.innerHTML = ' ✓&nbsp;&nbsp;All data cleared successfully!&nbsp; ~/output';
			fetchItems();
		}).catch(error => {
			statusElement.innerHTML = 'An error occurred. Please try again.';
			fetchItems();
		})
	sidebarHeaderMenu.click();
});

moveData.addEventListener('click', function () {
	fetch('/moveData', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				statusElement.textContent = data.error;
				return;
			}
			statusElement.textContent = data.message;
			fetchItems();
		}).catch(error => {
			statusElement.innerHTML = 'An error occurred. Please try again.';
			fetchItems();
		})
	sidebarHeaderMenu.click();
});


clearLog.addEventListener('click', function () {
	fetch('/clearLog', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	})
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				statusElement.textContent = data.error;
				return;
			}
			logContent.replaceChildren(logEmpty);
			statusElement.innerHTML = ' ✓&nbsp;&nbsp;Log cleared successfully';
		}).catch(error => {
			statusElement.innerHTML = 'An error occurred. Please try again.';

		})

	sidebarHeaderMenu.click();
});


function resetInputs() {
	urlInput.value = '';
	nameInput.value = '';
	statusElement.innerHTML = ' ';
	urlInput.className = '';
	nameInput.className = '';
	loader.classList.add('hidden');
	downloadButton.classList.remove('disabled');
	resetButton.classList.add('hidden');
	resetButton1.classList.add('hidden');

}

resetButton.addEventListener('click', function () {
	resetInputs();
});

resetButton1.addEventListener('click', function () {
	resetInputs();
});

const googleDriveFileRegex =
	/^https?:\/\/drive\.google\.com\/file\/d\/[^/?#]+(?:\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/i;

const magnetLinkRegex =
	/^magnet:\?(?=[^#\s]*\bxt=urn:btih:[a-z0-9]{32,40}(?:&|#|$))[^#\s]+(?:#.*)?$/i;

const mediaFileRegex =
	/^https?:\/\/[^\s?#]+\.(?:mkv|mp4|zip)(?:\?[^#]*)?(?:#.*)?$/i;

let overrideConfirmation = false;

urlInput.addEventListener('input', function () {
	resetButton.classList.remove('hidden');
	resetButton1.classList.remove('hidden');
	downloadButton.classList.remove('disabled');
	urlInput.className = '';
	nameInput.className = '';
	statusElement.innerHTML = '';
	overrideConfirmation = false;
	urlInput.classList.remove('urlInput-error');
	urlInput.classList.remove('urlInput-success');
});
nameInput.addEventListener('input', function () {
	resetButton.classList.remove('hidden');
	resetButton1.classList.remove('hidden');
	downloadButton.classList.remove('disabled');
	nameInput.classList.remove('nameInput-error');
	nameInput.classList.remove('nameInput-success');
});

downloadButton.addEventListener('click', function () {
	const url = urlInput.value;
	const name = nameInput.value;
	const mode = localStorage.getItem('mode');

	if (!url || !name) {

		if (!url && !name) {
			urlInput.className = 'urlInput-error';
			nameInput.className = 'nameInput-error';
			if (mode === 'gdrive') {
				statusElement.innerHTML = 'Please enter both a valid Google Drive URL and a file name';
			} else if (mode === 'siteDL') {
				statusElement.innerHTML = 'Please enter both a valid direct download URL and a file name';
			} else {
				statusElement.innerHTML = 'Please enter both a valid Magnet Link and a file name';
			}
		} else if (!url) {
			urlInput.className = 'urlInput-error';

			if (mode === 'gdrive') {
				statusElement.innerHTML = 'Please enter a valid Google Drive URL';
			} else if (mode === 'siteDL') {
				statusElement.innerHTML = 'Please enter a valid direct download URL (ZIP or Media file)';
			} else {
				statusElement.innerHTML = 'Please enter a valid Magnet Link';
			}
		} else if (!name) {
			nameInput.className = 'nameInput-error';

			statusElement.innerHTML = 'Please enter a file name';
		}

		return;

	}

	if (mode === 'gdrive') {
		if ((!googleDriveFileRegex.test(url))) {
			statusElement.innerHTML = 'Please enter a valid Google Drive URL';
			urlInput.className = 'urlInput-error';

			return;
		}
	} else if (mode === 'siteDL') {
		if ((!mediaFileRegex.test(url))) {
			statusElement.innerHTML = 'Please enter a valid direct download URL (ZIP or Media file)';
			urlInput.className = 'urlInput-error';

			return;
		}
	} else {
		if ((!magnetLinkRegex.test(url))) {
			statusElement.innerHTML = 'Please enter a valid Magnet Link';
			urlInput.className = 'urlInput-error';

			return;
		}
	}


	urlInput.className = 'urlInput-success';
	nameInput.className = 'nameInput-success';

	downloadButton.classList.add('disabled');
	loader.classList.remove('hidden');

	let category = document.querySelector('input[name="category"]:checked').value;

	fetch(`/download/${mode}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ url: url.trim().replace(/\s+/g, ''), override: overrideConfirmation, category: category, name: name.trim() })
	})
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				statusElement.textContent = data.error;
				urlInput.className = 'urlInput-error';
				nameInput.className = 'nameInput-error';
				loader.classList.add('hidden');
				downloadButton.classList.remove('disabled');
				if (data.override) {
					overrideConfirmation = true;
				}
			} else {
				statusElement.innerHTML = ' ✓&nbsp;&nbsp;Download started';
				sidebarHeaderMenuButton.classList.add('download-attention');
				loader.classList.add('hidden');
			}
			fetchItems()
		})
		.catch(error => {

			statusElement.innerHTML = 'An error occurred. Please try again.';
			urlInput.className = 'urlInput-error';
			nameInput.className = 'nameInput-error';
			loader.classList.add('hidden');
			downloadButton.classList.remove('disabled');
			fetchItems()
		});



});

const eventSource = new EventSource(`/stream-logs`);
let logUpdateTimeout;
let sidebarHeaderMenuLogTimeout;

eventSource.onmessage = (event) => {

	const data = JSON.parse(event.data);
	if (!data.historical) {
		sidebarHeaderMenuButton.classList.add('log-active');
		window.clearTimeout(sidebarHeaderMenuLogTimeout);
		sidebarHeaderMenuLogTimeout = window.setTimeout(() => {
			sidebarHeaderMenuButton.classList.remove('log-active');
		}, 1000);
		logSwitcher.classList.add('updating');
		window.clearTimeout(logUpdateTimeout);
		logUpdateTimeout = window.setTimeout(() => {
			logSwitcher.classList.remove('updating');
		}, 1000);
	}


	const timestamp = `[${new Date().toLocaleString("en-GB", {
		day: "2-digit",
		month: "short",
		hour: "numeric",
		minute: "2-digit",
		hour12: false
	}).replace(",", "")}]`;
	;

	logEmpty.remove();
	const logLine = document.createElement('div');
	logLine.classList.add('log-line');
	const logTimestamp = document.createElement('span');
	logTimestamp.classList.add('log-timestamp');
	logTimestamp.textContent = timestamp;
	const logMessage = document.createElement('span');
	logMessage.textContent = ` ${data.message}`;
	logLine.append(logTimestamp, logMessage);
	logContent.appendChild(logLine);

	logContent.scrollTop = logContent.scrollHeight;
};

eventSource.onerror = (err) => {
	console.error("SSE failed:", err);
	eventSource.close();
};
