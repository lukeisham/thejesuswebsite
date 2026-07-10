/**
 * Admin timeline cluster-placement module.
 *
 * Computes vertical (and optional horizontal fan-out) positions for event
 * dots that share the same timeline period, using the density tier from
 * AdminTimelineClusterDensity.
 *
 * @module admin-timeline/timeline-cluster-placement
 */

window.AdminTimelineClusterPlacement = {
  SPACING: {
    compact: 12,
    normal: 16,
    spread: 22,
  },

  FAN_SPREAD: 6,

  computeDotPositions: function (groupedEvents, pxPerPeriod) {
    var density = window.AdminTimelineClusterDensity.getClusterDensity(null, pxPerPeriod);
    var spacing = this.SPACING[density];
    var useFan = density === "spread";
    var positioned = {};

    var periods = Object.keys(groupedEvents);
    for (var p = 0; p < periods.length; p++) {
      var period = periods[p];
      var events = groupedEvents[period];
      var count = events.length;
      var stackHeight = (count - 1) * spacing;
      var startOffset = -stackHeight / 2;
      var positions = [];

      for (var i = 0; i < count; i++) {
        var yOffset = startOffset + i * spacing;
        var xFan = 0;
        if (useFan && count > 1) {
          var dir = i % 2 === 0 ? -1 : 1;
          var step = Math.floor(i / 2) + 1;
          xFan = dir * step * this.FAN_SPREAD;
        }
        positions.push({ event: events[i], yOffset: yOffset, xFan: xFan });
      }
      positioned[period] = positions;
    }
    return positioned;
  },
};
