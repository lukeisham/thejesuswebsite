/**
 * Admin timeline cluster-labels module.
 *
 * Decides the label display mode (full / truncated / hidden) for each
 * event based on how crowded its timeline period is, relative to the
 * current density tier.
 *
 * @module admin-timeline/timeline-cluster-labels
 */

window.AdminTimelineClusterLabels = {
  LABEL_FULL: "full",
  LABEL_TRUNCATED: "truncated",
  LABEL_HIDDEN: "hidden",

  computeLabelModes: function (descriptors, densityTier) {
    var self = this;
    return descriptors.map(function (desc) {
      var periodEvents = descriptors.filter(function (d) {
        return d.timeline_period === desc.timeline_period;
      });
      var count = periodEvents.length;

      if (densityTier === "compact") {
        if (count >= 4) return { event: desc.event, mode: self.LABEL_HIDDEN };
        if (count >= 2) return { event: desc.event, mode: self.LABEL_TRUNCATED };
        return { event: desc.event, mode: self.LABEL_FULL };
      }

      return { event: desc.event, mode: self.LABEL_FULL };
    });
  },
};
