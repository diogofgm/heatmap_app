define([
            'jquery',
            'underscore',
            'vizapi/SplunkVisualizationBase',
            'vizapi/SplunkVisualizationUtils',
            'plotly.js'
        ],
        function(
            $,
            _,
            SplunkVisualizationBase,
            SplunkVisualizationUtils,
            Plotly
        ) {

    return SplunkVisualizationBase.extend({
  
        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.id = _.uniqueId('heatmap');
            this.$el = $(this.el);
            this.$el.append('<div id="' + this.id + '" class="splunk-heatmap"></div>');

        },

        // Implement updateView to render a visualization.
        //  'data' will be the data object returned from formatData or from the search
        //  'config' will be the configuration property object
        updateView: function(data, config) {

            console.log('update')

            // clear for re-draw
            $('#' + this.id).empty()

            // get user defined colors
            var lowColor = config['display.visualizations.custom.heatmap_app.heatmap.lowColor'] || '#1E93C6';
            var highColor = config['display.visualizations.custom.heatmap_app.heatmap.highColor'] || '#D6563C';
            var setShowHover = config['display.visualizations.custom.heatmap_app.heatmap.setShowHover'] || 'all';

            // get user margins
            var leftMargin = parseFloat(config['display.visualizations.custom.heatmap_app.heatmap.leftMargin']) || 150;
            var rightMargin = parseFloat(config['display.visualizations.custom.heatmap_app.heatmap.rightMargin']) || 150;
            var topMargin = parseFloat(config['display.visualizations.custom.heatmap_app.heatmap.topMargin']) || 150;
            var bottomMargin = parseFloat(config['display.visualizations.custom.heatmap_app.heatmap.bottomMargin']) || 15;

            var xTitle = config['display.visualizations.custom.heatmap_app.heatmap.xTitle'] || '';  
            var yTitle = config['display.visualizations.custom.heatmap_app.heatmap.yTitle'] || '';              
            var xAngle = parseFloat(config['display.visualizations.custom.heatmap_app.heatmap.xAngle']) || 'auto';  
            var yAngle = parseFloat(config['display.visualizations.custom.heatmap_app.heatmap.yAngle']) || 'auto'; 

            var setShowScale = Boolean(parseInt(config['display.visualizations.custom.heatmap_app.heatmap.showScale'])) // default set in formatter


            var colorscaleValue = [
              [0, lowColor],
              [1, highColor],
            ];

            var data = [{
              x: data[0],
              y: data[1],
              z: data[2],
                text: data[2],
              type: 'heatmap',
              colorscale: colorscaleValue,
              showscale: setShowScale,
              hoverinfo: setShowHover,
              transpose: true
            }];

            var layout = {
              margin: {
                t: topMargin,
                b: bottomMargin,
                l: leftMargin,
                r: rightMargin
              },
              annotations: [],
              xaxis: {
                title: xTitle,
                tickangle: xAngle,
                ticks: '',
                side: 'top',
              },
              yaxis: {
                title: yTitle,
                tickangle: yAngle,
                ticks: '',
                ticksuffix: ' ',
                autosize: true
              },

              height: this.$el.height(),
              width: this.$el.width()
            };

            Plotly.newPlot(
                this.$el.children('.splunk-heatmap')[0],
                data, 
                layout,
                {
                    showLink: false,
                    displaylogo: false,

                    // buttons to remove can be found here:
                    // https://github.com/plotly/plotly.js/blob/e39244de7791c58656e6bfdd4c5eb0aa435c7990/src/components/modebar/buttons.js
                    modeBarButtonsToRemove: ['sendDataToCloud', 'resetCameraLastSave3d']
                }
            );


        },

        // Search data params
        getInitialDataParams: function() {
            return ({
                outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                count: 20000
            });
        },

        // Optionally implement to format data returned from search. 
        // The returned object will be passed to updateView as 'data'
        formatData: function(data, config) {


            if (data.rows.length){
                var fieldsLength = data.fields.length;
                var rowsLength = data.rows.length;
                var fields = data.fields;
                var rows = data.rows;
            }

            ////////////////////////
            //// ERROR CHECKING ////
            ////////////////////////

            // Throw Error if too many rows
            if (rowsLength > 20000){
                throw new SplunkVisualizationBase.VisualizationError(
                    'Row limit exceeded: 20,000'
                    );
            }


            ////////////////////////
            //// LE FORMAT DATA ////
            ////////////////////////

            // Please make sound effects for yourself as necessary 

            var yValues;
            var zValues = [];
            var xValues = [];

            // timechart returns _span and _spandays, we need to get rid of those 
            var fieldNames = _.pluck(fields, 'name');
            var spanIndex = _.indexOf(fieldNames, '_span');
            var spanDaysIndex = _.indexOf(fieldNames, '_spandays');
            var columns = _.unzip(rows);
            var filtered = _.filter(columns, function(columns, i){
                return i !== spanIndex && i !== spanDaysIndex
            })
            var rows = _.zip.apply(null, filtered)
            
            // grab y values, parse floats
            _.each(rows, function(r){
                var row = []
                var xValue = r.slice(0,1)[0]
                var sliced = r.slice(1)
                xValues.push(xValue)
                for (var p = 0; p < sliced.length; p++){
                    row.push(parseFloat(sliced[p]));
                }
                zValues.push(row)
            });

            // remove _span and first field and _spandays
            if (fields){
                 
                var filtered = _.filter(fieldNames, function(f, i){return f !== '_span' && f !== '_spandays'})
                var filtered = _.filter(filtered, function(f, i){return filtered.indexOf(f) !== 0 && rows})
                yValues = filtered;
            }


            return [xValues, yValues, zValues]

        },
        // Override to respond to re-sizing events
        reflow: function() {

            //If size changed, redraw.
            if($('#' + this.id).height() !== this.$el.height()) {
                $('#' + this.id).height(this.$el.height())
                this.invalidateUpdateView();
            }

            if($('#' + this.id + ' .svg-container').width() !== this.$el.width()) {
                $('#' + this.id + ' .svg-container').width(this.$el.width())
                this.invalidateUpdateView();
            }
        }
    });
});
