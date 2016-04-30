exports.listsList = {
  name:                   'lists:list',
  description:            'lists:list',
  outputExample:          {},
  middleware:             [ 'logged-in-session' ],

  inputs: {
    from: {
      required: false,
      formatter: function(p){ return parseInt(p); },
      default:   function(p){ return 0; },
    },
    size: {
      required: false,
      formatter: function(p){ return parseInt(p); },
      default:   function(p){ return 100; },
    },
    folder: {
      required: true,
      default:   function(){ return 'default'; },
    },
  },

  run: function(api, data, next){

    api.models.list.findAndCountAll({
      where: {folder: data.params.folder},
      order: 'folder asc, name asc',
      offset: data.params.from,
      limit: data.params.size,
    }).then(function(response){
      data.response.total = response.count;
      data.response.lists = [];

      response.rows.forEach(function(list){
        data.response.lists.push( list.apiData(api) );
      });

      next();
    }).catch(next);
  }
};
