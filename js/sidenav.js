let pages = document.getElementsByClassName("page");
let sidenav_list = document.getElementById("sidenav-list");

console.log(pages.length);
for (let i = 0; i < pages.length; i++) {
    let li = document.createElement('li');
    li.innerText = "&middot";
    sidenav_list.appendChild(li);
}

function topFunction() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}