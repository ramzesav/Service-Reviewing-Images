"use strict";

const wrapReviewingImage = document.querySelector('.wrap');
const menu = document.getElementsByClassName('menu')[0];
const dragMenu = menu.firstElementChild;
const image = document.getElementsByClassName('current-image')[0];
const comments = document.getElementsByClassName('comments')[0];
const draw = document.getElementsByClassName('draw')[0];
let connection = '',
    maska = document.querySelector('.mask'),
    idPic,
    comCheck = document.querySelectorAll('.comments__marker-checkbox'),
    colorsRadio = document.getElementsByName('color');

const drawCanvas = document.createElement('canvas');
drawCanvas.classList.add('canvas');
let ctx  = drawCanvas.getContext('2d');


document.addEventListener("DOMContentLoaded", (event) => {

    // Сохранение состояния страницы
    if('src' in sessionStorage) {
      image.firstElementChild.src = sessionStorage.src;
    }

    // Проверка через regExp, переход по ссылке с поля поделиться
    const linkEx = /id={1}/g;

    if(linkEx.test(window.location.href)) {
      openMode();

      let regExp = /id=.+/gm;
      let resultId  = regExp.exec(document.getElementsByClassName('menu__item tool share-tools')[0].firstElementChild.value)
      resultId = resultId[0].replace('id=', '');
      idPic = resultId;

      const dataPicture =  getInfoImage(resultId);

      document.getElementsByClassName('picture')[0].src  = dataPicture.url;

      if('mask' in dataPicture) {
        maska.width = image.firstElementChild.width;
        maska.height = image.firstElementChild.height;
        saveMaskUrl(dataPicture.mask);
      }

      openSocket(resultId);
      addCommentsAfterJump(resultId);
    }
});


// WebSocket
function openSocket(id) {
	connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${id}`);

	connection.addEventListener('open', () => console.log('opened'));

	connection.addEventListener('message', event => {
		console.log(JSON.parse(event.data));
		let newSmth = JSON.parse(event.data);
		if (newSmth.event === 'comment') {
			let needingForm = document.querySelector(`[style="left: ${newSmth.comment.left}px; top: ${newSmth.comment.top}px;"]`);

			if (needingForm !== null) {
				let com = document.createElement('div');
				com.classList.add('comment');
				com.innerHTML = `
					<p class="comment__time">${new Date(newSmth.comment.timestamp).toLocaleString("ru")}</p>
      		<p class="comment__message">${newSmth.comment.message}</p>
				`;
				needingForm.querySelector('.comments__body').insertBefore(com, needingForm.querySelector('.loader'));
			}
			else {
				addForm(newSmth.comment.left, newSmth.comment.top);
				needingForm = document.querySelector(`[style="left: ${newSmth.comment.left}px; top: ${newSmth.comment.top}px;"]`);
				let com = document.createElement('div');
				com.classList.add('comment');
				com.innerHTML = `
					<p class="comment__time">${new Date(newSmth.comment.timestamp).toLocaleString("ru")}</p>
      		<p class="comment__message">${newSmth.comment.message}</p>
				`;
				needingForm.querySelector('.comments__body').insertBefore(com, needingForm.querySelector('.loader'));

				comCheck.forEach(com => com.checked = false);
			}
		}

		if (newSmth.event === 'mask') {
			console.log('mask');
			let maskUrl = newSmth.url;
			maska.width = image.firstElementChild.width;
			maska.height = image.firstElementChild.height;
      saveMaskUrl(maskUrl);
      maska.classList.add('canvas');
			setTimeout(() => ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height), 100);
		}
	});
}

function saveMaskUrl(url) {
  maska.src = url;

}


// Открытие остальных режимов
function openMode() {
  comments.dataset.state = 'selected';
  share.dataset.state = 'default';
  loadingImages.dataset.state = 'default';
  draw.dataset.state = 'default';

  comments.classList.remove('hidden');
  loadingImages.classList.add('hidden');
  toggleBurger.classList.remove('hidden');
  dropShare.getElementsByClassName('menu__url')[0].value = window.location;
}

// Плавающие меню
let movedMenu = null;

let minY, minX, maxX, maxY;
let shiftX = 0;
let shiftY = 0;

function dragStart(event) {
  if(event.target.classList.contains('drag')) {
    movedMenu = event.target.parentElement;


    minY = wrapReviewingImage.offsetTop;
    minX = wrapReviewingImage.offsetLeft;
    maxX = wrapReviewingImage.offsetLeft + wrapReviewingImage.offsetWidth - (movedMenu.offsetWidth + 1);
    maxY = wrapReviewingImage.offsetTop + wrapReviewingImage.offsetHeight - movedMenu.offsetHeight;
    shiftX = event.pageX - event.target.getBoundingClientRect().left - window.pageXOffset;
    shiftY = event.pageY - event.target.getBoundingClientRect().top - window.pageYOffset;
  }
}

function drag(x, y) {
  if(movedMenu) {

    x = x - shiftX;
    y = y - shiftY;
    x = Math.min(x, maxX);
    y = Math.min(y, maxY);
    x = Math.max(x, minX);
    y = Math.max(y, minY);
    movedMenu.style.left = x + 'px';
    movedMenu.style.top = y + 'px';
    movedMenu.classList.add('moving');
  }
}

function drop(event) {
  if(movedMenu) {
    const check = document.elementFromPoint(event.clientX, event.clientY);
    wrapReviewingImage.insertBefore(movedMenu, wrapReviewingImage.firstElementChild);
    movedMenu.classList.remove('moving');
    movedMenu = null;
  }
}

document.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', event => {
  drag(event.pageX, event.pageY);
});
document.addEventListener('mouseup', drop);


// ПУБЛИКАЦИЯ ИЗОБРАЖЕНИЙ

const loadingImages = document.getElementsByClassName('mode new')[0];
const loader = document.getElementsByClassName('image-loader')[0];
const error = document.getElementsByClassName('error')[0];
const toggleBurger = document.getElementsByClassName('burger')[0];


const dropShare = document.getElementsByClassName('menu__item tool share-tools')[0];
const share = document.getElementsByClassName('menu__item mode share')[0];


// POST запрос на добавления изображения
function dataRequest(file) {

  const formData = new FormData();
  formData.append('title', file.name);
  formData.append('image', file);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://neto-api.herokuapp.com/pic', true);


  xhr.addEventListener('load', event => {

    if(xhr.status === 200) {

      const dataPic = JSON.parse(xhr.responseText);
      image.firstElementChild.src = dataPic.url;
      sessionStorage.src  = image.firstElementChild.src;


      // Режим рецензирования

      loadingImages.getElementsByClassName('menu__item-title')[0].innerHTML = 'Загрузить<br>новое';
      loadingImages.classList.add('hidden');
      toggleBurger.classList.add('visible-inline');
      share.classList.add('visible-inline');
      share.dataset.state = 'selected';

      const toolsShare = document.getElementsByClassName('share-tools')[0];
      toolsShare.firstElementChild.value = window.location + '?id=' + dataPic.id;

    }else {
      error.style.display = 'block';
    };
  });

  xhr.addEventListener('loadstart', event => {
    error.style.display = 'none';

    image.classList.add('tool');
    image.firstElementChild.src = "";

    loader.style.display = 'block';
  });


  xhr.addEventListener('loadend', event => {
    image.classList.remove('tool');

    loader.style.display = 'none';
  });

  xhr.send(formData);
};


// Получение информации об изображении
function getInfoImage(id) {

  const infoXhr = new XMLHttpRequest();
  infoXhr.open('GET', `https://neto-api.herokuapp.com/pic/${id}`, false);

  infoXhr.send();

  return JSON.parse(infoXhr.responseText);

};

// Загрузка файла через поле
loadingImages.addEventListener('click', loadingFile);

function loadingFile(event) {

  if(event.target.classList.contains('menu__item-title')) {

    const input = document.createElement('input');
    input.type = "file";
    input.accept = "image/jpeg, image/png";
    input.id = "fileInput";

    event.target.innerHTML = "";
    event.target.appendChild(input);
    sessionStorage.src = image.firstElementChild.src;

    if(event.target) {
      document.getElementById('fileInput').addEventListener('change', event => {

        dataRequest(event.currentTarget.files[0]);

      });
    };
  };
};

// Загрузка файла через перетаскивание
function updateFilesInfo(files) {
  dataRequest(files[0]);
};

wrapReviewingImage.addEventListener('drop', onFilesDrop)
wrapReviewingImage.addEventListener('dragover', event => {
  event.preventDefault();
});

function onFilesDrop(event) {
  event.preventDefault();
  const files = Array.from(event.dataTransfer.files);

  updateFilesInfo(files);
};

//Переключение между режимами
menu.addEventListener('click', (event) => {

  if(event.target.classList.contains('menu__item-title') && event.target.parentElement.classList.contains('mode')) {
    event.target.parentElement.dataset.state = 'selected';
    toggleBurger.classList.add('visible-inline');

    for(let i = 0; i < event.currentTarget.children.length; i++) {
      if(event.currentTarget.children[i].hasAttribute('data-state')) {
        if(event.currentTarget.children[i].dataset.state === 'default' && !(event.currentTarget.children[i].classList.contains('drag'))) {
          event.currentTarget.children[i].classList.add('hidden');
          event.currentTarget.children[i].classList.remove('visible-inline');
        }
      }
    }
  }
});

// Переключение между режимами, через кнопку BURGER
toggleBurger.addEventListener('click', (event) => {
  loadingImages.classList.remove('hidden');
  loadingImages.getElementsByClassName('menu__item-title')[0].innerHTML = 'Загрузить<br>новое';

  // При нажатие на бургер, удаляется стиль z-index у канвас
  for(let i = 0; i < wrapReviewingImage.children.length; i++) {
    if(wrapReviewingImage.children[i].classList.contains('canvas')) {
      wrapReviewingImage.children[i].removeAttribute('style');
    }
  }


  for(let i = 0; i < menu.children.length; i++) {
    if(menu.children[i].dataset.state === 'selected') {
      menu.children[i].dataset.state = 'default';
    }

    if(menu.children[i].dataset.state === 'default' || menu.children[i].dataset.state === 'selected') {
      menu.children[i].classList.remove('hidden')
    }
  }

  event.currentTarget.classList.remove('visible-inline');
  event.currentTarget.classList.add('hidden');
});


// Копирования ссылки в режиме поделиться
document.getElementsByClassName('menu_copy')[0].addEventListener('click', (event) => {
  event.preventDefault();

  document.getElementsByClassName('menu__url')[0].select();
  document.execCommand('copy');
});


// РЕЖИМ КОММЕНТИРОВАНИЕ

const toggleBg = document.getElementsByClassName('menu__toggle-bg')[0];

toggleBg.addEventListener('click', managementReview);


//Добавление комментариев после перехода по ссылке из режима поделиться
function addCommentsAfterJump(id) {

  let addCommentsInfo = getInfoImage(id);
  let keyComments = Object.keys(addCommentsInfo.comments);
  image.firstElementChild.src = addCommentsInfo.url;

  let array = [];

  for(var i = 0; i < keyComments.length; i++) {

    if(addCommentsInfo.comments[keyComments[i-1]] === undefined) {
      array.push([addCommentsInfo.comments[keyComments[i]]])
    }else if((addCommentsInfo.comments[keyComments[i-1]] === undefined) && (addCommentsInfo.comments[keyComments[i]].left === addCommentsInfo.comments[keyComments[i-1]].left) && (addCommentsInfo.comments[keyComments[i]].right === addCommentsInfo.comments[keyComments[i-1]].right)) {
      array[array.length - 1].push(addCommentsInfo.comments[keyComments[i]]);
    }else {
      array.push([addCommentsInfo.comments[keyComments[i]]]);
    }
  }

  for(let i = 0; i < array.length; i++) {
    addForm(array[i][0].left, array[i][0].top);

      for(let j = 0; j < array[i].length; j++) {

        let forms = document.querySelector(`[style="left: ${array[i][j].left}px; top: ${array[i][j].top}px;"]`);
        let comment = document.createElement('div');

        comment.classList.add('comment');
        comment.innerHTML = `
          <p class='comment__time'>${new Date(array[i][j].timestamp).toLocaleString("ru").split(',').join('')}</p>
          <p class='comment__message'>${array[i][j].message}</p>
        `

        forms.querySelector('.comments__marker-checkbox').removeAttribute('checked');
        forms.querySelector('.comments__body').insertBefore(comment, forms.querySelector('.loader'));
      }

  }

  // Удаление похожих маркеров по позиции и пустых форм - без комментов
  let marker = document.querySelectorAll('.comments__form');
  for(let i = 0; i < marker.length; i++) {
    if(marker[i-1] !== undefined) {
      if((marker[i-1].style.left === marker[i].style.left && marker[i-1].style.top === marker[i].style.top) || !(marker[i].getElementsByClassName('comment')[0])){
        image.removeChild(marker[i]);
      }
    }
  }
};


// Скрытие canvas, при нажатие на режим комментария
document.getElementsByClassName('menu__item mode comments')[0].addEventListener('click', hideCanvase)

function hideCanvase(event) {
  if(event.target.classList.contains('menu__item-title') && event.target.textContent === 'Комментарии') {
    for(let i = 0; i < wrapReviewingImage.children.length; i++) {
      if(wrapReviewingImage.children[i].classList.contains('canvas')) {
        wrapReviewingImage.children[i].style.zIndex= '-1';
      }
    }
  }
}

// Реализация переключателя комментариев
function managementReview(event) {
  let comments = document.getElementsByClassName('comments__form');

  for(let i = 0; i < comments.length; i++) {
    if(event.target.value === 'off') {
      comments[i].classList.add('hidden');
    }else{
      comments[i].classList.remove('hidden');
    }
  }
};

// Добавление маркеров на холст
function addForm(x, y) {


	const form = document.createElement('form');
	form.classList.add('comments__form');

	form.innerHTML = `
	<span class="comments__marker"></span><input type="checkbox" checked class="comments__marker-checkbox">
	<div class="comments__body ">
		<div class="loader hidden">
			<span></span>
			<span></span>
			<span></span>
			<span></span>
			<span></span>
		</div>
		<textarea class="comments__input" type="text" placeholder="Напишите ответ..."></textarea>
		<input class="comments__close" type="button" value="Закрыть">
		<input class="comments__submit" type="submit" value="Отправить">
	</div>`;

	form.style.left = `${x}px`;
	form.style.top = `${y}px`;

	image.appendChild(form);


}

wrapReviewingImage.addEventListener('click', getHolstComments);

function getHolstComments(event) {

  if(event.target.classList.contains('picture') && (comments.dataset.state === 'default' || comments.dataset.state === 'selected')) {
    addForm(event.offsetX, event.offsetY);
  }
 };


 // Работа c формой

// Отмена открытия формы при нажатие на маркер
document.addEventListener('click', (event) => {
   if(event.target.classList.contains('comments__marker-checkbox')) {
      event.preventDefault();
      restrictionComments();

      event.target.parentElement.getElementsByClassName('comments__body')[0].classList.add('visible');
      event.target.setAttribute('checked', '')
   }
});




// Удаление формы при скрытие
document.addEventListener('click', closeComments)

 function closeComments(event) {
   if(event.target.classList.contains('comments__close')) {
     event.target.parentElement.previousElementSibling.removeAttribute('checked')
     event.target.parentElement.classList.remove('visible');
   }
 };

// Открытие только одной формы с комментами
function restrictionComments() {
  let markerComments = document.querySelectorAll('.comments__body');

  for(let i = 0; i < markerComments.length; i++) {
    if(markerComments[i].classList.contains('visible')) {
      markerComments[i].classList.remove('visible');
    }
  }
}

// Отправка формы
document.addEventListener('click', sendComments);

function sendComments(event) {
  if(event.target.classList.contains('comments__submit')) {
    event.preventDefault();

    let formComment = event.target.parentElement.getElementsByClassName('comments__input')[0].value;
    let comment = document.createElement('div');

    let posX, posY;

    if(event.target.parentElement.parentElement.hasAttribute('style')) {
      posX = event.target.parentElement.parentElement.style.left.split('px')[0];
      posY = event.target.parentElement.parentElement.style.top.split('px')[0];
    }else {
      posX = event.target.parentElement.parentElement.offsetX;
      posY = event.target.parentElement.parentElement.offsetY;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://neto-api.herokuapp.com/pic/${idPic}/comments`, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    var params = 'message=' + encodeURIComponent(formComment) + '&left=' + encodeURIComponent(posX) + '&top=' + encodeURIComponent(posY);

    xhr.addEventListener('load', (event) => {
      let dataComments = JSON.parse(xhr.responseText);
    });

    xhr.addEventListener('loadstart', () => {
      event.target.previousElementSibling.previousElementSibling.previousElementSibling.classList.remove('hidden');
    });


    xhr.addEventListener('loadend', () => {
      event.target.previousElementSibling.previousElementSibling.previousElementSibling.classList.add('hidden');
    });

    if(formComment !== '') {
      event.target.parentElement.insertBefore(comment, event.target.parentElement.getElementsByClassName('loader')[0]);
      event.target.parentElement.getElementsByClassName('comments__input')[0].value = '';
      xhr.send(params);
    };
  }
}

 // РЕЖИМ РИСОВАНИЯ

  // Выбор цвета
let color;


document.getElementsByClassName('menu__item tool draw-tools')[0].addEventListener('click', choiceColor)

function clearCheck(elem) {

  for(let i = 0; i < elem.children.length; i++) {
    if(elem.children[i].hasAttribute('checked')) {
      elem.children[i].removeAttribute('checked')
    }
  }
};

function choiceColor(event) {
  switch (event.target.value) {
    case 'red':
      clearCheck(event.currentTarget);

      event.target.setAttribute('checked', 'true');
      color = '#ea5d56';
      break;

    case 'yellow':
      clearCheck(event.currentTarget);

      event.target.setAttribute('checked', 'true');
      color = '#f3d135';
      break;
    case 'green':
      clearCheck(event.currentTarget);

      event.target.setAttribute('checked', 'true');
      color = '#6cbe47';
      break;

      case 'blue':
        clearCheck(event.currentTarget);

        event.target.setAttribute('checked', 'true');
        color = '#53a7f5';
        break;

    default:
      clearCheck(event.currentTarget);

      event.target.setAttribute('checked', 'true');
      color = '#b36ade';

  }
};


draw.getElementsByClassName('menu__item-title')[0].addEventListener('click', creationCanvas);

function creationCanvas(event) {
  // Удаление атрибута стайл, после скрытия в режиме комментария
  for(let i = 0; i < wrapReviewingImage.children.length; i++) {
    if(wrapReviewingImage.children[i].classList.contains('canvas')) {
      wrapReviewingImage.children[i].removeAttribute('style');
    }
  }

  // Удаления класса canvas у маски, после передачи ссылки через режим поделиться
  for(let i = 0; i <  wrapReviewingImage.children.length; i++) {
    if(wrapReviewingImage.children[i].classList.contains('mask')) {
      if(wrapReviewingImage.children[i].classList.contains('canvas')) {
        wrapReviewingImage.children[i].classList.remove('canvas');
      }
    }
  }

  // Добавление канваса на холст
  let canvas = [];

  for(let i = 0; i < wrapReviewingImage.children.length; i++) {
    if(wrapReviewingImage.children[i].classList.contains('canvas')) {
       canvas.push(wrapReviewingImage.children[i]);
    }
  }


  drawCanvas.width = image.firstElementChild.width;
  drawCanvas.height = image.firstElementChild.height;

  if(canvas.length === 0){
    wrapReviewingImage.appendChild(drawCanvas);
  }else {
    return false;
  }

  if(event.target) {
    // const canvas = document.getElementsByClassName('canvas')[0];

    let curves = [],
      repaint = false,
      draw = false;


    drawCanvas.addEventListener('mousedown', event => {
        event.preventDefault();
        draw = true
        let curve = [],
        point = [event.offsetX, event.offsetY];
        curve.push(point);
        curves.push(curve);

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(event.offsetX, event.offsetY, 4/2, 0, 2 * Math.PI);
        ctx.fill();

        repaint = true;
    })

    drawCanvas.addEventListener('mousemove', event => {
      event.preventDefault();
        if (draw) {
          let point = [event.offsetX, event.offsetY];
          curves[curves.length - 1].push(point);
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          ctx.stroke();
          repaint = true;

          debounceSendMask();
        }
    })

    drawCanvas.addEventListener('mouseup', ()=> {
      draw = false;
    })

    drawCanvas.addEventListener('mouseleave', () => {
      draw = false;
    })

    function circle(point) {
   	 	ctx.beginPath();
    	ctx.arc(...point, 4 / 2, 0, 2 * Math.PI);
    	ctx.fill();
  	}

  	function smoothBetween(p1, p2) {
  		const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
  	  ctx.quadraticCurveTo(...p1, ...cp);
  	}

  	function smoothCurve(points) {
  		ctx.beginPath();

  		ctx.moveTo(...points[0]);

  		for (let i = 1; i < points.length - 1; i++) {
  			smoothBetween(points[i], points[i + 1]);
  		}

  		ctx.stroke();
  	}

  	function repaintCanvas() {
    	ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    	curves.forEach(curve => {
     		circle(curve[0]);
     		smoothCurve(curve);
    	})
  	}

  	function tick() {

    	if (repaint) {
      	repaintCanvas();
      	repaint = false;
    	}

    	window.requestAnimationFrame(tick);
  	}

  	tick();
  }
}

function debounce(callback, delay = 0) {
  let timeout;
  return () => {
  	clearTimeout(timeout);
  	timeout = setTimeout(() => {
  		timeout = null;
  		callback();
  	}, delay);
  }
}

const debounceSendMask = debounce(sendMaskState, 100);

function sendMaskState() {
  drawCanvas.toBlob(blob => connection.send(blob));
}
