'use strict';

var pdf;
var currPage = 1;
var numPages = 0;

var leftCanvas = $('#canvas-left');
var rightCanvas = $('#canvas-right');

function renderSpread(page) {
	var leftPage;
	if (2 * (page - 1) > numPages) {
		leftPage = 2 * (numPages - page) + 3;
	} else {
		leftPage =  2 * (page - 1);
	}

	var rightPage;
	if (2 * (page - 1) >= numPages) {
		rightPage = 2 * (numPages - page) + 2;
	} else {
		rightPage = 2 * page - 1;
	}
	
	renderPage(leftPage, leftCanvas, false);
	renderPage(rightPage, rightCanvas, true);
}

function renderPage(pdfPage, canvasEl) {
	var pageToGet = pdfPage == 0 ? 1 : pdfPage;
	var canvas = canvasEl[0];

	pdf.getPage(pageToGet).then(function (page) {
		var viewport = page.getViewport({ scale: 1.5 });

		$('.page').css('height', viewport.height + 'px');
		$('.page').css('width', (viewport.width / 2) + 'px');

		var context = canvas.getContext('2d');
		canvas.height = viewport.height;
		canvas.width = viewport.width;

		var renderContext = {
			canvasContext: context,
			viewport: viewport
		};

		canvasEl.removeClass('end');
		if (pdfPage === 0) {
			// The cover and back cover are accompanied by blank pages
			context.fillStyle = 'white';
			context.fillRect(0, 0, canvas.width, canvas.height);
			canvasEl.addClass('end');
		} else {
			page.render(renderContext);
		}

		$('#container').css('height', (viewport.height + 1) + 'px');
		$('#container').css('width', (viewport.width + 3) + 'px');
	});
}

function toBase64(file) {
	return new Promise(function (resolve, reject) {
		var reader = new FileReader();
		reader.readAsBinaryString(file);
		reader.onload = () => resolve(reader.result);
		reader.onerror = error => reject(error);
	});
};

function init() {
	leftCanvas.click(function (event) {
		if (currPage > 1) {
			renderSpread(--currPage);
		}
	});

	rightCanvas.click(function (event) {
		if (currPage <= numPages) {
			renderSpread(++currPage);
		}
	});

	$('#pdf-selector').change(async function () {
		var file = $('#pdf-selector')[0].files[0];
		var pdfBlob = await toBase64(file);

		var loadingTask = pdfjsLib.getDocument({data: pdfBlob});
		loadingTask.promise.then(function (loadedPdf) {
			if (loadedPdf.numPages % 2 == 1) {
				alert('Expected imposed zine to have an even number of pages!');
				$('#pdf-selector').val(null);
				return;
			}

			pdf = loadedPdf;
			numPages = pdf.numPages;
			renderSpread(currPage);

			$('#pdf-uploader').css('display', 'none');
			$('#pdf-viewer').css('display', 'block');
		});
	});
}