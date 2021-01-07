'use strict';

var pdf;
var pdfSettings;
var currPage = 1;

var leftCanvas = $('#canvas-left');
var rightCanvas = $('#canvas-right');

function computePage(page) {
	var pageNums = {};
	if (pdfSettings.imposed) {
		if (2 * (page - 1) > pdf.numPages) {
			pageNums['left'] = 2 * (pdf.numPages - page) + 3;
		} else {
			pageNums['left'] =  2 * (page - 1);
		}

		if (2 * (page - 1) >= pdf.numPages) {
			pageNums['right'] = 2 * (pdf.numPages - page) + 2;
		} else {
			pageNums['right'] = 2 * page - 1;
		}
	} else {
		pageNums['left'] = 2 * (page - 1);
		pageNums['right'] = 2 * page - 1;
	}
	return pageNums;
}

function renderSpread(page) {
	var pageNums = computePage(page);
	
	renderPage(pageNums['left'], leftCanvas);
	renderPage(pageNums['right'], rightCanvas);
}

function renderPage(pdfPage, canvasEl) {
	var pageToGet = pdfPage == 0 ? 1 : pdfPage;
	var canvas = canvasEl[0];

	pdf.getPage(pageToGet).then(function (page) {
		var viewport = page.getViewport({ scale: 1.5 }); // TODO: Add scaling support in the future
		var pageWidth = viewport.width;
		var pageHeight = viewport.height;

		var context = canvas.getContext('2d');
		canvas.height = pageHeight;
		canvas.width = pageWidth;

		var renderContext = {
			canvasContext: context,
			viewport: viewport
		};

		if (pdfPage === 0) {
			// The cover and back cover are accompanied by blank pages
			context.fillStyle = 'black';
			context.fillRect(0, 0, canvas.width, canvas.height);
			canvasEl.addClass('end');
		} else {
			page.render(renderContext);
			canvasEl.removeClass('end');
		}

		$('#container').css('height', (viewport.height + 3) + 'px');
		$('#container').css('width', ((pdfSettings.imposed ? 1 : 2) * viewport.width + 3) + 'px');

		$('.page').css('height', pageHeight + 'px');
		$('.page').css('width', pageWidth + 'px');

		if ([0, 180].includes(pdfSettings.rotation)) {
			$('.page').css('width', pageWidth / 2 + 'px');
		} else {
			$('.page').css('height', pageHeight / 2 + 'px');
		}
	});
}

function toBase64(file) {
	return new Promise(function (resolve, reject) {
		var reader = new FileReader();
		reader.readAsArrayBuffer(file);
		reader.onload = function () {
			resolve(reader.result);
		};
		reader.onerror = function (error) {
			reject(error);
		};
	});
};

function init() {
	$('#option-imposed').click(function () {
		var imposed = $('#option-imposed').prop('checked');

		$('#option-rotate').prop('disabled', !imposed);
		$('#option-rotation-angle').prop('disabled', !imposed);

		if (!imposed) {
			$('#option-rotate').prop('checked', false);
		}
	});

	$('#btn-view').click(async function () {
		if (!$('#pdf-selector').val()) {
			alert("No file selected!");
			return;
		}

		var file = $('#pdf-selector')[0].files[0]; 
		var pdfBlob = await toBase64(file);

		pdfSettings = {
			"imposed": $('#option-imposed').prop('checked'),
			"rotation": $('#option-rotate').prop('checked') ? parseInt($('#option-rotation-angle').val(), 10) : 0
		};

		var loadingTask = pdfjsLib.getDocument({ data: pdfBlob });
		loadingTask.promise.then(function (loadedPdf) {
			pdf = loadedPdf;

			if (pdf.numPages % 2 == 1) {
				alert('Expected imposed zine to have an even number of pages!');
				$('#pdf-selector').val(null);
				return;
			}

			// After certain rotations, pages end up on opposite side
			if ([90, 180].includes(pdfSettings.rotation)) {
				rightCanvas = $('#canvas-left');
				leftCanvas = $('#canvas-right');
			}

			$('#pdf-uploader').css('display', 'none');
			$('#pdf-viewer').css('display', 'block');

			$('#pdf-viewer').css('transform', 'rotate(' + pdfSettings.rotation + 'deg)');
			if ([0, 180].includes(pdfSettings.rotation)) {
				$('.page').addClass('not-rotated');
			} else {
				$('.page').addClass('rotated');
			}

			leftCanvas.click(function (event) {
				if (currPage > 1) {
					renderSpread(--currPage);
				}
			});

			rightCanvas.click(function (event) {
				if (currPage <= pdf.numPages) {
					renderSpread(++currPage);
				}
			});

			renderSpread(currPage);
		});
	});
}