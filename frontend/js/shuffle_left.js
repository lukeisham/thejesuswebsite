document.addEventListener("DOMContentLoaded", () => {
    const btnLeft = document.getElementById("shuffle-left");
    if (!btnLeft) return;

    btnLeft.addEventListener("click", () => {
        const timePoints = Array.from(document.querySelectorAll(".time-point[data-period]"));
        let activeIdx = timePoints.findIndex(el => el.classList.contains("active"));

        if (activeIdx === -1) {
            activeIdx = 0;
        } else if (activeIdx > 0) {
            activeIdx--;
        }

        timePoints[activeIdx].click();
    });
});
