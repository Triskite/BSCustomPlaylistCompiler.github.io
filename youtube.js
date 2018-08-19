var playlisturl = '';
var playlistZip = new JSZip();
var songsLoaded = 0;
var songsEnabled = 0;
var songsDownloaded = 0;
getPlaylistHTML();
window.setTimeout(checkRefresh, 15000);

function checkRefresh() {
	if (document.getElementById('songTable').rows.length == 1) {
		console.log('reload');
		location.reload();
	}
}

function getURL() {
	var origurl = decodeURIComponent(new URL(window.location.href).searchParams.get('playlisturl'));
	var playlisturl = '';
	if (origurl.includes('list=')) {
		playlisturl = 'https://www.youtube.com/playlist?list=' + (new URL(origurl).searchParams.get('list'));
	} else {
		playlisturl = origurl;
	}
	return playlisturl;
}

function getPlaylistHTML() {
	var htmlFile = new XMLHttpRequest();
	htmlFile.open('GET', 'https://cors.io/?' + getURL(), true);
	htmlFile.onreadystatechange = function() {
		if (htmlFile.readyState === 4) {  // Makes sure the document is ready to parse.
			if (htmlFile.status === 200) {  // Makes sure it's found the file.
				var allText = htmlFile.responseText;
				var myText = allText.split('["ytInitialData"] = ')[1].split('\n')[0];
				myText = myText.slice(0, myText.length - 1)
				var resourceJSON = JSON.parse(myText);
				var firstSongID = resourceJSON['contents']['twoColumnBrowseResultsRenderer']['tabs'][0]['tabRenderer']['content']['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents'][0]['playlistVideoListRenderer']['contents'][0]['playlistVideoRenderer']['videoId'];
				var playlistID = resourceJSON['responseContext']['serviceTrackingParams'][1]['params'][0]['value'];
				playlistID = playlistID.slice(2, playlistID.length);
				getFirstSongHTML('https://www.youtube.com/watch?v=' + firstSongID + '&list=' + playlistID);
			} else {
				getPlaylistHTML();
			}
		}
	}
	htmlFile.send(null);
}

function getFirstSongHTML(firstSongURL) {
	var htmlFile = new XMLHttpRequest();
	htmlFile.open('GET', 'https://cors.io/?' + firstSongURL, true);
	htmlFile.onreadystatechange = function() {
		if (htmlFile.readyState === 4) {  // Makes sure the document is ready to parse.
			if (htmlFile.status === 200) {  // Makes sure it's found the file.
				var allText = htmlFile.responseText;
				getSongs(allText);
			} else {
				getFirstSongHTML(firstSongURL);
			}
		}
	}
	htmlFile.send(null);
}

function getSongs(sourceHTML) {
	var myText = sourceHTML.split('["ytInitialData"] = ')[1].split('\n')[0];
	myText = myText.slice(0, myText.length - 1)
	var resourceJSON = JSON.parse(myText);
	var songItems = resourceJSON['contents']['twoColumnWatchNextResults']['playlist']['playlist']['contents'];
	var songNames = new Array();
	var songArtists = new Array();
	for (songItem in songItems) {
		try {
			songNames.push(songItems[songItem]['playlistPanelVideoRenderer']['title']['simpleText']);
			songArtists.push(songItems[songItem]['playlistPanelVideoRenderer']['title']['simpleText']);
		} catch (err) {}
	}
	for (artist in songArtists) {
		songArtists[artist] = songArtists[artist].split('-')[0].trim();
	}
	for (song in songNames) {
		if (songNames[song].includes('-')) {
			songNames[song] = songNames[song].split('-')[1];
		}
		if (songNames[song].includes('feat.')) {
			songNames[song] = songNames[song].slice(0, songNames[song].indexOf('feat.'));
		}
		if (songNames[song].includes('ft.')) {
			songNames[song] = songNames[song].slice(0, songNames[song].indexOf('ft.'));
		}
		if (songNames[song].includes('(')) {
			songNames[song] = songNames[song].slice(0, songNames[song].indexOf('('));
		}
		if (songNames[song].includes('/')) {
			songNames[song] = songNames[song].slice(0, songNames[song].indexOf('/'));
		}
		if (songNames[song].includes('[')) {
			songNames[song] = songNames[song].slice(0, songNames[song].indexOf('ft.'));
		}
		if (songNames[song].includes('{')) {
			songNames[song] = songNames[song].slice(0, songNames[song].indexOf('ft.'));
		}
		songNames[song] = songNames[song].trim();
	}
	for (song in songNames) {
		var filtSong = songNames[song].toString().toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
		getBeatsaverHTML(filtSong, songNames[song], songArtists[song]);
	}
}

function getBeatsaverHTML(filtSong, songName, songArtist) {
	var htmlFile = new XMLHttpRequest();
	htmlFile.open('GET', 'https://cors.io/?https://www.beatsaver.com/search/all/' + encodeURIComponent(filtSong), true);
	htmlFile.onreadystatechange = function() {
		if (htmlFile.readyState === 4) {  // Makes sure the document is ready to parse.
			if (htmlFile.status === 200) {  // Makes sure it's found the file.
				var allText = htmlFile.responseText;
				displaySong(allText, songName, songArtist);
			} else {
				getBeatsaverHTML(filtSong, songName, songArtist);
			}
		}
	}
	htmlFile.send(null);
}

function displaySong(beatsaverHTML, songName, songArtist) {
	var table = document.getElementById('songTable');
	var row = table.insertRow(songsLoaded + 1);
	var songCell = row.insertCell(0);
	var artistCell = row.insertCell(1);
	var beatsaverCell = row.insertCell(2);
	var downloadCell = row.insertCell(3);
	songCell.innerHTML = songName;
	artistCell.innerHTML = songArtist;
	if (beatsaverHTML.includes('<a href="https://www.beatsaver.com/browse/detail/') || beatsaverHTML.includes('<a href="https://beatsaver.com/browse/detail/') || beatsaverHTML.includes('<a href="https://www.beatsaver.com/index.php/browse/detail/') || beatsaverHTML.includes('<a href="https://beatsaver.com/index.phpbrowse/detail/')) {
		var beatsaverCellHTML = '<select onchange="updateDownloads()" style="width: 100%;"><option value="[No Song]">[No Song]</option>';
		var defaultSet = false;
		var regex = /<a href="https:\/\/(www\.)?beatsaver\.com\/(index\.php\/)?browse\/detail\//gi, result, strIndices = [];
		while ( (result = regex.exec(beatsaverHTML)) ) {
			strIndices.push(parseInt(result.index) + 45);
		}
		var bsSongID = '';
		var bsSongName = '';
		for (arrIndex in strIndices) {
			var thisIndex = strIndices[arrIndex];
			var secondIndex = beatsaverHTML.slice(parseInt(thisIndex), beatsaverHTML.length).indexOf('"');
			bsSongID = beatsaverHTML.slice(parseInt(thisIndex), parseInt(thisIndex) + parseInt(secondIndex));
			if (bsSongID.includes('ail/')) {
				bsSongID = bsSongID.slice(4, bsSongID.length)
			}
			if (bsSongID.includes('etail/')) {
				bsSongID = bsSongID.slice(6, bsSongID.length)
			}
			var thirdIndex = beatsaverHTML.slice(parseInt(thisIndex) + parseInt(secondIndex) + 6, beatsaverHTML.length).indexOf('</h2></a>');
			bsSongName = beatsaverHTML.slice(parseInt(thisIndex) + parseInt(secondIndex) + 6, parseInt(thisIndex) + parseInt(secondIndex) + 6 + parseInt(thirdIndex));
			if (defaultSet) {
			beatsaverCellHTML += '<option value="';
			} else {
			beatsaverCellHTML += '<option selected="selected" value="';
			defaultSet = true;
			}
			beatsaverCellHTML += bsSongID + '">' + bsSongName + '</option>';
		}
		beatsaverCellHTML += '</select>';
		beatsaverCell.innerHTML = beatsaverCellHTML;
	} else {
		beatsaverCell.innerHTML = '<select style="width: 100%;"><option selected="selected" value="[No Song]">[No Song]</option></select>';
	}
	updateDownloads();
	songsLoaded += 1;
}
	
function updateDownloads() {
	var table = document.getElementById('songTable');
	var loadedSongCount = 0;
	for (arrRow in table.rows) {
		if (arrRow != 0) {
			var myRow = table.rows[arrRow];
			try {
				var mySelect = myRow.cells[2].getElementsByTagName('select')[0];
			} catch (err) {}
			var bsSongID = mySelect.options[mySelect.selectedIndex].value;
			if (bsSongID == '[No Song]') {
				try {
					myRow.cells[3].innerHTML = 'N/A';
				} catch (err) {}
			} else {
				try {
					loadedSongCount += 1;
					myRow.cells[3].innerHTML = '<a href="https://beatsaver.com/download/' + bsSongID + '/">' + bsSongID + '</a>';
				} catch (err) {}
			}
		}
	}
	songsEnabled = loadedSongCount;
}

function downloadAll() {
	document.getElementById('btnDownloadAll').disabled = true;
	for (rowID in document.getElementById('songTable').rows) {
		if (rowID != 0) {
			try {
				document.getElementById('songTable').rows[rowID].cells[2].getElementsByTagName('select')[0].disabled = true;
			} catch (err) {}
		}
	}
	alert('Download Started - Compiling may take a few minutes...');
	songsDownloaded = 0;
	var table = document.getElementById('songTable');
	for (arrRow in table.rows) {
		if (arrRow != 0) {
			var myRow = table.rows[arrRow];
			try {
				var mySelect = myRow.cells[2].getElementsByTagName('select')[0];
			} catch (err) {}
			var bsSongID = mySelect.options[mySelect.selectedIndex].value;
			if (bsSongID != '[No Song]') {
				downloadSong(bsSongID);
			}
		}
	}
}

function downloadSong(bsSongID) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET','https://beatsaver.com/download/' + bsSongID + '/',true);
	xhr.overrideMimeType('application/octet-stream');
	xhr.responseType = 'arraybuffer';
	xhr.onload = function (v) {
		var arrBuff = xhr.response;
		playlistZip.file(bsSongID + '.zip', arrBuff);
		songsDownloaded += 1;
		if (songsDownloaded >= songsEnabled) {
			playlistZip.generateAsync({type:'blob'}).then(function (blob) {
				saveAs(blob, "BeatSaverPlaylist.zip");
				document.getElementById('btnDownloadAll').disabled = false;
				for (rowID in document.getElementById('songTable').rows) {
					if (rowID != 0) {
						try {
							document.getElementById('songTable').rows[rowID].cells[2].getElementsByTagName('select')[0].disabled = false;
						} catch (err) {}
					}
				}
			}, function (err) {
				console.log(err);
			});
		}
	};
	xhr.onerror = function (e) {
		downloadSong(bsSongID);
	};
	xhr.send();
}
