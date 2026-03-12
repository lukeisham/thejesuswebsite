document.addEventListener("DOMContentLoaded", () => {
    const btnRight = document.getElementById("shuffle-right");
    if (!btnRight) return;

    btnRight.addEventListener("click", () => {
        const timePoints = Array.from(document.querySelectorAll(".time-point[data-period]"));
        let activeIdx = timePoints.findIndex(el => el.classList.contains("active"));

        if (activeIdx === -1) {
            activeIdx = 0;
        } else if (activeIdx < timePoints.length - 1) {
            activeIdx++;
        }

        timePoints[activeIdx].click();
    });
});
