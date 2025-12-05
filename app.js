console.log('[app.js] 文件开始加载...');
const $ = (id) => document.getElementById(id);

const STORAGE_KEY_APP = 'pff-app-v2';
const STORAGE_KEY_BACKUPS = 'pff-backups-v1';
const MAX_BACKUPS = 10; // 最多保留10个备份

const store = {
  customers: [],
  ingredients: [],
  recipes: [],
  orders: [],
  page: 1,
  pageSize: 10,
  totalCustomers: 0, // 后端返回的总数
  totalPages: 1, // 后端返回的总页数
  ingredientPage: 1,
  ingredientPageSize: 10,
  recipePage: 1,
  recipePageSize: 10,
  totalRecipes: 0, // 后端返回的总数
  recipeTotalPages: 1, // 后端返回的总页数
  orderPage: 1,
  orderPageSize: 10
};

// 品牌和采购渠道数据存储
const BRANDS_STORAGE_KEY = 'pff-brands-v1';
const SOURCES_STORAGE_KEY = 'pff-sources-v1';
// 所属科目、部位、产地类型数据存储
const SUBJECTS_STORAGE_KEY = 'pff-subjects-v1';
const PARTS_STORAGE_KEY = 'pff-parts-v1';
const ORIGIN_TYPES_STORAGE_KEY = 'pff-origin-types-v1';
// 主要营养素数据存储
const MAIN_NUTRIENTS_STORAGE_KEY = 'pff-main-nutrients-v1';

// 类别数据缓存（避免重复请求）
const categoriesCache = new Map(); // key: classification, value: { data: [], timestamp: number }
const CACHE_DURATION = 60000; // 缓存1分钟

// 预加载状态
let preloadInProgress = false;

// 初始化品牌和采购渠道数据
function initBrandsAndSources() {
  if (!localStorage.getItem(BRANDS_STORAGE_KEY)) {
    // 默认品牌列表（从现有原料中提取）
    const defaultBrands = [];
    localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(defaultBrands));
  }
  // 注意：不再自动初始化默认采购渠道，让用户自己管理
  // 如果确实需要初始化，可以从后端加载的原料中提取
  if (!localStorage.getItem(SOURCES_STORAGE_KEY)) {
    // 只有在完全没有数据时才初始化空数组，不设置默认值
    localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify([]));
  }
}

// 初始化主要营养素数据
function initMainNutrients() {
  if (!localStorage.getItem(MAIN_NUTRIENTS_STORAGE_KEY)) {
    // 初始化空数组，让用户自己管理
    localStorage.setItem(MAIN_NUTRIENTS_STORAGE_KEY, JSON.stringify([]));
  }
}

const UNITS_STORAGE_KEY = 'pff-units';

// 获取品牌列表
function getBrands() {
  try {
    const stored = localStorage.getItem(BRANDS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取品牌列表失败:', e);
  }
  return [];
}

// 保存品牌列表
function saveBrands(brands) {
  try {
    localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(brands));
  } catch (e) {
    console.error('保存品牌列表失败:', e);
  }
}

// 获取采购渠道列表
function getSources() {
  try {
    const stored = localStorage.getItem(SOURCES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取采购渠道列表失败:', e);
  }
  return [];
}

// 保存采购渠道列表
function saveSources(sources) {
  try {
    localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(sources));
  } catch (e) {
    console.error('保存采购渠道列表失败:', e);
  }
}

// 加载品牌列表到下拉框
function populateBrandSelect() {
  const select = $('i-brand');
  if (!select) return;
  
  const brands = getBrands();
  select.innerHTML = '<option value="">请选择品牌</option>';
  brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    select.appendChild(option);
  });
}

// 加载采购渠道列表到下拉框
function populateSourceSelect() {
  const select = $('i-source');
  if (!select) return;
  
  const sources = getSources();
  select.innerHTML = '<option value="">请选择采购渠道</option>';
  sources.forEach(source => {
    const option = document.createElement('option');
    option.value = source;
    option.textContent = source;
    select.appendChild(option);
  });
}

// 加载所属科目列表到下拉框
function populateSubjectSelect() {
  const select = $('i-subject');
  if (!select) return;
  
  const subjects = getSubjects();
  select.innerHTML = '<option value="">请选择所属科目</option>';
  subjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    option.textContent = subject;
    select.appendChild(option);
  });
}

// 加载部位列表到下拉框
function populatePartSelect() {
  const select = $('i-part');
  if (!select) return;
  
  const parts = getParts();
  select.innerHTML = '<option value="">请选择部位</option>';
  parts.forEach(part => {
    const option = document.createElement('option');
    option.value = part;
    option.textContent = part;
    select.appendChild(option);
  });
}

// 获取主要营养素列表
function getMainNutrients() {
  try {
    const stored = localStorage.getItem(MAIN_NUTRIENTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取主要营养素列表失败:', e);
  }
  return [];
}

// 保存主要营养素列表
function saveMainNutrients(mainNutrients) {
  try {
    localStorage.setItem(MAIN_NUTRIENTS_STORAGE_KEY, JSON.stringify(mainNutrients));
  } catch (e) {
    console.error('保存主要营养素列表失败:', e);
  }
}

// 加载主要营养素列表到下拉框
function populateMainNutrientSelect() {
  const select = $('i-mainNutrient');
  if (!select) return;
  
  const mainNutrients = getMainNutrients();
  select.innerHTML = '<option value="">请选择主要营养素</option>';
  mainNutrients.forEach(nutrient => {
    const option = document.createElement('option');
    option.value = nutrient;
    option.textContent = nutrient;
    select.appendChild(option);
  });
}

// 获取所属科目列表
function getSubjects() {
  try {
    const stored = localStorage.getItem(SUBJECTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取所属科目列表失败:', e);
  }
  return [];
}

// 保存所属科目列表
function saveSubjects(subjects) {
  try {
    localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(subjects));
  } catch (e) {
    console.error('保存所属科目列表失败:', e);
  }
}

// 获取部位列表
function getParts() {
  try {
    const stored = localStorage.getItem(PARTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取部位列表失败:', e);
  }
  return [];
}

// 保存部位列表
function saveParts(parts) {
  try {
    localStorage.setItem(PARTS_STORAGE_KEY, JSON.stringify(parts));
  } catch (e) {
    console.error('保存部位列表失败:', e);
  }
}

// 获取产地类型列表
function getOriginTypes() {
  try {
    const stored = localStorage.getItem(ORIGIN_TYPES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取产地类型列表失败:', e);
  }
  // 默认值
  return ['国产', '进口', '有机', '无抗', '其他'];
}

// 保存产地类型列表
function saveOriginTypes(originTypes) {
  try {
    localStorage.setItem(ORIGIN_TYPES_STORAGE_KEY, JSON.stringify(originTypes));
  } catch (e) {
    console.error('保存产地类型列表失败:', e);
  }
}

// 加载产地类型列表到下拉框
function populateOriginTypeSelect() {
  const select = $('i-originType');
  if (!select) return;
  
  const originTypes = getOriginTypes();
  select.innerHTML = '<option value="">请选择产地类型</option>';
  originTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });
}

// 获取单位列表
function getUnits() {
  try {
    const stored = localStorage.getItem(UNITS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取单位列表失败:', e);
  }
  // 默认单位列表：与原先下拉框保持一致
  return ['g', 'kg', 'ml', 'L', '个', '包', '盒', '瓶', '袋'];
}

// 保存单位列表
function saveUnits(units) {
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
  } catch (e) {
    console.error('保存单位列表失败:', e);
  }
}

// 加载单位列表到下拉框
function populateUnitSelect() {
  const select = $('i-unit');
  if (!select) return;

  const units = getUnits();
  select.innerHTML = '<option value=\"\">请选择单位</option>';
  units.forEach(unit => {
    const option = document.createElement('option');
    option.value = unit;
    option.textContent = unit;
    select.appendChild(option);
  });
}

let currentQuoteCustomerId = null;
let currentQuoteSelectedRecipeIds = new Set();
let quoteRecipeFilter = { search: '', lifeStage: '' };
const QUOTE_DAYS_OPTIONS = [7, 15, 30];
const QUOTE_SHIPPING_OPTIONS = [
  { value: 'remote', label: '异地快递' },
  { value: 'local', label: '同城快递' },
  { value: 'none', label: '无需快递' }
];
let quoteOverrides = null;
let currentQuoteRenderState = null;

// 省市区数据缓存
let chinaRegionsData = null;
let regionsDataLoading = false;

// 从GitHub加载省市区数据
// 使用多个数据源作为备选，确保可用性
async function loadChinaRegions() {
  if (chinaRegionsData) {
    return chinaRegionsData;
  }
  
  if (regionsDataLoading) {
    // 如果正在加载，等待加载完成
    while (regionsDataLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return chinaRegionsData;
  }
  
  regionsDataLoading = true;
  
  try {
    // 尝试从多个数据源加载数据
    // 数据源1: modood/Administrative-divisions-of-China (更完整)
    const dataUrl1 = 'https://cdn.jsdelivr.net/gh/modood/Administrative-divisions-of-China@master/dist/pca-code.json';
    // 数据源2: caijf/lcn 的 pca.json
    const dataUrl2 = 'https://cdn.jsdelivr.net/gh/caijf/lcn@master/pca.json';
    // 数据源3: mumuy/data_location
    const dataUrl3 = 'https://cdn.jsdelivr.net/gh/mumuy/data_location@latest/data.json';
    
    let data = null;
    let dataSource = '';
    let lastError = null;
    
    // 尝试多个数据源
    const dataSources = [
      { url: dataUrl1, name: 'modood/Administrative-divisions-of-China' },
      { url: dataUrl2, name: 'caijf/lcn' },
      { url: dataUrl3, name: 'mumuy/data_location' }
    ];
    
    for (const source of dataSources) {
      try {
        console.log(`正在从GitHub加载省市区数据 (${source.name}):`, source.url);
        const response = await fetch(source.url, { 
          cache: 'no-cache',
          headers: {
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          data = await response.json();
          dataSource = source.name;
          console.log(`✓ 使用 ${source.name} 数据源`);
          break;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e) {
        console.warn(`${source.name} 数据源加载失败:`, e);
        lastError = e;
        continue;
      }
    }
    
    if (!data) {
      throw new Error(`所有数据源加载失败: ${lastError?.message || '未知错误'}`);
    }
    
    console.log('GitHub数据加载成功，数据源:', dataSource, '原始数据格式:', typeof data, 'keys:', Object.keys(data).slice(0, 5));
    
    // 转换数据格式
    const regions = {};
    let provinceCount = 0;
    let cityCount = 0;
    let districtCount = 0;
    
    // 检查数据格式：caijf/lcn 的格式是 {code: {name, children: [...]}}
    // mumuy/data_location 的格式是 {code: {name, level, child: {...}}}
    const firstKey = Object.keys(data)[0];
    const firstItem = data[firstKey];
    const hasChildren = firstItem?.children !== undefined;
    const hasChild = firstItem?.child !== undefined;
    const hasLevel = firstItem?.level !== undefined;
    
    console.log('数据格式检测:', { hasChildren, hasChild, hasLevel, firstItem });
    
    if (hasChildren) {
      // caijf/lcn 格式：{code: {name, children: [{code, name, children: [...]}]}}
      // 或者可能是 {name: {children: [...]}} 格式
      Object.keys(data).forEach(provinceKey => {
        const province = data[provinceKey];
        if (!province) return;
        
        // 获取省份名称：可能是 key 本身，也可能是 province.name
        const provinceName = province.name || provinceKey;
        if (!provinceName) return;
        
        regions[provinceName] = {};
        provinceCount++;
        
        if (province.children && Array.isArray(province.children)) {
          province.children.forEach(city => {
            if (!city) return;
            
            // 获取城市名称：可能是 city.name，也可能是 city 本身是字符串
            const cityName = typeof city === 'string' ? city : (city.name || city.code);
            if (!cityName) return;
            
            regions[provinceName][cityName] = [];
            cityCount++;
            
            // 处理区县：可能是 city.children 数组，也可能是其他格式
            if (city.children && Array.isArray(city.children)) {
              city.children.forEach(district => {
                if (!district) return;
                
                // 获取区县名称：可能是 district.name，也可能是 district 本身是字符串
                const districtName = typeof district === 'string' ? district : (district.name || district.code);
                if (districtName) {
                  regions[provinceName][cityName].push(districtName);
                  districtCount++;
                }
              });
            } else if (Array.isArray(city)) {
              // 如果 city 本身是数组（区县列表）
              city.forEach(district => {
                const districtName = typeof district === 'string' ? district : (district?.name || district?.code);
                if (districtName) {
                  regions[provinceName][cityName].push(districtName);
                  districtCount++;
                }
              });
            }
            
            // 对于直辖市，如果城市名与省份名相同或包含省份名，确保数据正确
            const municipalities = ['北京市', '天津市', '上海市', '重庆市'];
            if (municipalities.includes(provinceName)) {
              // 直辖市：如果城市名不是省份名，尝试使用省份名作为键
              if (cityName !== provinceName && cityName !== provinceName.replace('市', '')) {
                // 如果还没有省份名作为键，创建一个
                if (!regions[provinceName][provinceName]) {
                  regions[provinceName][provinceName] = [];
                }
                // 合并区县数据到省份名键下
                if (regions[provinceName][cityName].length > 0) {
                  regions[provinceName][provinceName] = regions[provinceName][provinceName].concat(regions[provinceName][cityName]);
                  // 去重
                  regions[provinceName][provinceName] = [...new Set(regions[provinceName][provinceName])];
                }
              }
            }
            
            if (regions[provinceName][cityName].length === 0) {
              regions[provinceName][cityName] = ['其他区县'];
            }
          });
        }
        
        // 记录每个省份的城市数量用于调试
        const citiesInProvince = Object.keys(regions[provinceName]).length;
        if (citiesInProvince > 0) {
          console.log(`省份 ${provinceName} 有 ${citiesInProvince} 个城市:`, Object.keys(regions[provinceName]).join(', '));
          // 对于直辖市，特别记录区县数量
          const municipalities = ['北京市', '天津市', '上海市', '重庆市'];
          if (municipalities.includes(provinceName)) {
            const cityKeys = Object.keys(regions[provinceName]);
            cityKeys.forEach(cityKey => {
              const districtCount = regions[provinceName][cityKey]?.length || 0;
              console.log(`  城市 ${cityKey}: ${districtCount} 个区县`);
            });
          }
        }
      });
    } else if (hasChild) {
      // mumuy/data_location 格式：{code: {name, level, child: {...}}}
      Object.keys(data).forEach(provinceCode => {
        const province = data[provinceCode];
        const provinceLevel = province?.level;
        const isProvince = provinceLevel === 1 || provinceLevel === '1' || provinceLevel === 'province';
        
        if (province && isProvince && province.name) {
          const provinceName = province.name;
          regions[provinceName] = {};
          provinceCount++;
          
          if (province.child) {
            Object.keys(province.child).forEach(cityCode => {
              const city = province.child[cityCode];
              const cityLevel = city?.level;
              const isCity = cityLevel === 2 || cityLevel === '2' || cityLevel === 'city';
              
              if (city && isCity && city.name) {
                const cityName = city.name;
                regions[provinceName][cityName] = [];
                cityCount++;
                
                if (city.child) {
                  Object.keys(city.child).forEach(districtCode => {
                    const district = city.child[districtCode];
                    const districtLevel = district?.level;
                    const isDistrict = districtLevel === 3 || districtLevel === '3' || districtLevel === 'district' || districtLevel === 'area';
                    
                    if (district && isDistrict && district.name) {
                      regions[provinceName][cityName].push(district.name);
                      districtCount++;
                    }
                  });
                }
                
                if (regions[provinceName][cityName].length === 0) {
                  regions[provinceName][cityName] = ['其他区县'];
                }
              }
            });
          }
        }
      });
    } else {
      throw new Error('无法识别的数据格式');
    }
    
    console.log('✓ 省市区数据转换完成:', { 
      数据源: dataSource,
      省份数: provinceCount, 
      城市数: cityCount, 
      区县数: districtCount,
      转换后的省份数: Object.keys(regions).length 
    });
    
    // 验证数据：检查每个省份的城市数量
    // 直辖市列表：这些省份的行政结构特殊，城市数量少是正常的
    const municipalities = ['北京市', '天津市', '上海市', '重庆市'];
    
    Object.keys(regions).forEach(province => {
      const cities = Object.keys(regions[province]);
      if (cities.length === 0) {
        console.warn('省份没有城市数据:', province);
      } else if (cities.length === 1 && cities[0] === '其他市') {
        console.warn('省份只有"其他市"选项:', province);
      } else {
        const cityList = cities.filter(c => c !== '其他市');
        console.log(`省份 ${province} 有 ${cities.length} 个城市 (${cityList.length} 个实际城市):`, cityList.slice(0, 10).join(', '), cityList.length > 10 ? '...' : '');
        // 直辖市的城市数量少是正常的，不需要警告
        if (cityList.length <= 2 && !municipalities.includes(province)) {
          console.warn(`⚠️ 省份 ${province} 的城市数量可能不足，只有 ${cityList.length} 个城市`);
        }
      }
    });
    
    if (Object.keys(regions).length === 0) {
      throw new Error('数据转换后为空，可能数据格式不匹配');
    }
    
    chinaRegionsData = regions;
    return regions;
  } catch (error) {
    console.warn('从GitHub加载省市区数据失败，使用备用数据:', error);
    
    // 备用数据：使用轻量级的基础数据
    chinaRegionsData = {
      '北京市': { '北京市': ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区'] },
      '上海市': { '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'] },
      '天津市': { '天津市': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区'] },
      '重庆市': { '重庆市': ['万州区', '涪陵区', '渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '綦江区', '大足区', '渝北区', '巴南区', '黔江区', '长寿区', '江津区', '合川区', '永川区', '南川区', '璧山区', '铜梁区', '潼南区', '荣昌区', '开州区', '梁平区', '武隆区', '城口县', '丰都县', '垫江县', '忠县', '云阳县', '奉节县', '巫山县', '巫溪县', '石柱土家族自治县', '秀山土家族苗族自治县', '酉阳土家族苗族自治县', '彭水苗族土家族自治县'] },
      '四川省': { '成都市': ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区', '青白江区', '新都区', '温江区', '双流区', '郫都区', '新津区', '金堂县', '大邑县', '蒲江县', '都江堰市', '彭州市', '邛崃市', '崇州市', '简阳市'], '其他市': ['其他区县'] },
      '广东省': { '广州市': ['荔湾区', '越秀区', '海珠区', '天河区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '从化区', '增城区'], '深圳市': ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区'], '其他市': ['其他区县'] },
      '江苏省': { '南京市': ['玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区', '雨花台区', '江宁区', '六合区', '溧水区', '高淳区'], '苏州市': ['虎丘区', '吴中区', '相城区', '姑苏区', '吴江区', '常熟市', '张家港市', '昆山市', '太仓市'], '其他市': ['其他区县'] },
      '浙江省': { '杭州市': ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '富阳区', '临安区', '桐庐县', '淳安县', '建德市'], '宁波市': ['海曙区', '江北区', '北仑区', '镇海区', '鄞州区', '奉化区', '象山县', '宁海县', '余姚市', '慈溪市'], '其他市': ['其他区县'] },
      '山东省': { '济南市': ['历下区', '市中区', '槐荫区', '天桥区', '历城区', '长清区', '章丘区', '济阳区', '莱芜区', '钢城区', '平阴县', '商河县'], '青岛市': ['市南区', '市北区', '黄岛区', '崂山区', '李沧区', '城阳区', '即墨区', '胶州市', '平度市', '莱西市'], '其他市': ['其他区县'] },
      '河南省': { '郑州市': ['中原区', '二七区', '管城回族区', '金水区', '上街区', '惠济区', '中牟县', '巩义市', '荥阳市', '新密市', '新郑市', '登封市'], '其他市': ['其他区县'] },
      '湖北省': { '武汉市': ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区', '东西湖区', '汉南区', '蔡甸区', '江夏区', '黄陂区', '新洲区'], '其他市': ['其他区县'] },
      '湖南省': { '长沙市': ['芙蓉区', '天心区', '岳麓区', '开福区', '雨花区', '望城区', '长沙县', '宁乡市', '浏阳市'], '其他市': ['其他区县'] },
      '河北省': { '石家庄市': ['长安区', '桥西区', '新华区', '井陉矿区', '裕华区', '藁城区', '鹿泉区', '栾城区'], '其他市': ['其他区县'] },
      '山西省': { '太原市': ['小店区', '迎泽区', '杏花岭区', '尖草坪区', '万柏林区', '晋源区'], '其他市': ['其他区县'] },
      '内蒙古自治区': { '呼和浩特市': ['新城区', '回民区', '玉泉区', '赛罕区', '土默特左旗', '托克托县', '和林格尔县', '清水河县', '武川县'], '包头市': ['东河区', '昆都仑区', '青山区', '石拐区', '白云鄂博矿区', '九原区', '土默特右旗', '固阳县', '达尔罕茂明安联合旗'], '其他市': ['其他区县'] },
      '辽宁省': { '沈阳市': ['和平区', '沈河区', '大东区', '皇姑区', '铁西区', '苏家屯区', '浑南区', '沈北新区', '于洪区', '辽中区'], '大连市': ['中山区', '西岗区', '沙河口区', '甘井子区', '旅顺口区', '金州区', '普兰店区'], '其他市': ['其他区县'] },
      '吉林省': { '长春市': ['南关区', '宽城区', '朝阳区', '二道区', '绿园区', '双阳区', '九台区'], '其他市': ['其他区县'] },
      '黑龙江省': { '哈尔滨市': ['道里区', '南岗区', '道外区', '平房区', '松北区', '香坊区', '呼兰区', '阿城区', '双城区'], '其他市': ['其他区县'] },
      '安徽省': { '合肥市': ['瑶海区', '庐阳区', '蜀山区', '包河区', '长丰县', '肥东县', '肥西县', '庐江县', '巢湖市'], '其他市': ['其他区县'] },
      '福建省': { '福州市': ['鼓楼区', '台江区', '仓山区', '马尾区', '晋安区', '长乐区'], '厦门市': ['思明区', '海沧区', '湖里区', '集美区', '同安区', '翔安区'], '其他市': ['其他区县'] },
      '江西省': { '南昌市': ['东湖区', '西湖区', '青云谱区', '青山湖区', '新建区', '红谷滩区'], '其他市': ['其他区县'] },
      '广西壮族自治区': { '南宁市': ['兴宁区', '青秀区', '江南区', '西乡塘区', '良庆区', '邕宁区', '武鸣区'], '其他市': ['其他区县'] },
      '海南省': { '海口市': ['秀英区', '龙华区', '琼山区', '美兰区'], '三亚市': ['海棠区', '吉阳区', '天涯区', '崖州区'], '其他市': ['其他区县'] },
      '贵州省': { '贵阳市': ['南明区', '云岩区', '花溪区', '乌当区', '白云区', '观山湖区'], '其他市': ['其他区县'] },
      '云南省': { '昆明市': ['五华区', '盘龙区', '官渡区', '西山区', '东川区', '呈贡区', '晋宁区'], '其他市': ['其他区县'] },
      '西藏自治区': { '拉萨市': ['城关区', '堆龙德庆区', '达孜区'], '其他市': ['其他区县'] },
      '陕西省': { '西安市': ['新城区', '碑林区', '莲湖区', '灞桥区', '未央区', '雁塔区', '阎良区', '临潼区', '长安区', '高陵区', '鄠邑区'], '其他市': ['其他区县'] },
      '甘肃省': { '兰州市': ['城关区', '七里河区', '西固区', '安宁区', '红古区'], '其他市': ['其他区县'] },
      '青海省': { '西宁市': ['城东区', '城中区', '城西区', '城北区', '湟中区'], '其他市': ['其他区县'] },
      '宁夏回族自治区': { '银川市': ['兴庆区', '西夏区', '金凤区'], '其他市': ['其他区县'] },
      '新疆维吾尔自治区': { '乌鲁木齐市': ['天山区', '沙依巴克区', '新市区', '水磨沟区', '头屯河区', '达坂城区', '米东区'], '其他市': ['其他区县'] },
      '香港特别行政区': { '香港特别行政区': ['中西区', '湾仔区', '东区', '南区', '深水埗区', '油尖旺区', '九龙城区', '黄大仙区', '观塘区', '荃湾区', '屯门区', '元朗区', '北区', '大埔区', '沙田区', '西贡区', '葵青区', '离岛区'] },
      '澳门特别行政区': { '澳门特别行政区': ['花地玛堂区', '花王堂区', '望德堂区', '大堂区', '风顺堂区', '嘉模堂区', '路凼填海区', '圣方济各堂区'] },
      '台湾省': { '台北市': ['中正区', '大同区', '中山区', '松山区', '大安区', '万华区', '信义区', '士林区', '北投区', '内湖区', '南港区', '文山区'], '其他市': ['其他区县'] }
    };
    
    console.log('使用备用省市区数据，共', Object.keys(chinaRegionsData).length, '个省份');
    return chinaRegionsData;
  } finally {
    regionsDataLoading = false;
  }
}

// 后端 API 状态管理
const API_BASE_STORAGE_KEY = 'pff-api-base-url';
const API_TOKEN_STORAGE_KEY = 'pff-api-token';
const API_USER_STORAGE_KEY = 'pff-api-user';

const detectedOrigin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null')
  ? window.location.origin
  : null;

const defaultApiBaseUrl = (() => {
  try {
    const stored = localStorage.getItem(API_BASE_STORAGE_KEY);
    if (stored) return stored;
  } catch (e) {}
  
  // 如果检测到的origin是8080端口（前端静态服务器），自动改为3000端口（后端API服务器）
  if (detectedOrigin) {
    try {
      const url = new URL(detectedOrigin);
      if (url.port === '8080' || (!url.port && url.hostname === '8.137.166.134')) {
        // 前端静态服务器在8080，后端API在3000
        return `http://${url.hostname}:3000`;
      }
      // 其他情况，如果端口不是3000，也尝试使用3000
      if (url.port && url.port !== '3000') {
        return `http://${url.hostname}:3000`;
      }
      return detectedOrigin;
    } catch (e) {
      // URL解析失败，使用默认值
    }
  }
  
  return 'http://8.137.166.134:3000';
})();

const backendState = {
  baseUrl: defaultApiBaseUrl,
  token: null,
  user: null
};

// 从 localStorage 恢复后端状态
function loadBackendAuth() {
  try {
    const token = localStorage.getItem(API_TOKEN_STORAGE_KEY);
    const userStr = localStorage.getItem(API_USER_STORAGE_KEY);
    if (token) {
      backendState.token = token;
      if (userStr) {
        try {
          backendState.user = JSON.parse(userStr);
        } catch (e) {
          backendState.user = null;
        }
      }
    }
  } catch (e) {
    console.warn('加载后端认证信息失败:', e);
  }
}

// 清除后端认证信息
function clearBackendAuth(skipRedirect = false) {
  backendState.token = null;
  backendState.user = null;
  try {
    localStorage.removeItem(API_TOKEN_STORAGE_KEY);
    localStorage.removeItem(API_USER_STORAGE_KEY);
  } catch (e) {
    console.warn('清除后端认证信息失败:', e);
  }
  updateAuthUI();
}

// 后端 API 请求函数
async function backendRequest(path, options = {}) {
  if (!backendState.baseUrl) {
    throw new Error('未配置后台接口地址');
  }
  const url = backendState.baseUrl.replace(/\/$/, '') + path;
  const fetchOptions = {
    method: options.method || 'GET',
    mode: 'cors', // 明确指定 CORS 模式
    credentials: 'include', // 包含凭证（cookies）
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    }
  };
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      fetchOptions.body = options.body;
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    } else {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }
  }
  if (!options.skipAuth && backendState.token) {
    fetchOptions.headers.Authorization = `Bearer ${backendState.token}`;
  }
  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    console.warn('后台请求失败:', error);
    throw new Error('无法连接后台服务，请检查网络或接口地址。');
  }
  let data = null;
  const contentType = response.headers ? response.headers.get('content-type') : '';
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (error) {
      console.warn('解析后台返回数据失败:', error);
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      if (text) {
        data = { message: text };
      }
    } catch (error) {
      data = null;
    }
  }
  if (response.status === 401) {
    clearBackendAuth(true);
    throw new Error('登录已过期，请重新登录。');
  }
  if (!response.ok) {
    // 404/484错误时，使用更友好的错误消息（静默处理）
    if (response.status === 404 || response.status === 484) {
      throw new Error('Resource not found');
    }
    const message = data && typeof data === 'object'
      ? data.message || data.error || `请求失败 (${response.status})`
      : `请求失败 (${response.status})`;
    throw new Error(message);
  }
  if (data && typeof data === 'object' && data.success === false) {
    throw new Error(data.message || '请求失败');
  }
  // 如果返回格式是 {success: true, data: {...}}，自动解包 data 字段
  if (data && typeof data === 'object' && data.success === true && data.data !== undefined) {
    return data.data;
  }
  return data;
}

// 后端登录函数
async function backendLogin(email, password) {
  const payload = await backendRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true
  });
  // backendRequest 已经自动解包了 {success: true, data: {...}} 格式，直接返回 data 内容
  // 所以 payload 直接是 {token, user} 格式
  if (!payload || !payload.token || !payload.user) {
    throw new Error((payload && payload.message) || '登录失败，请检查账号或密码。');
  }
  const { token, user } = payload;
  backendState.token = token;
  backendState.user = user;
  try {
    localStorage.setItem(API_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(API_USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('保存后端认证信息失败:', e);
  }
  updateAuthUI();
  return { token, user };
}

// CKU/FCI 犬种分类数据（按FCI标准分组）
const CKU_BREEDS = [
  { group: '第1组：牧羊犬和牧牛犬', breeds: ['边境牧羊犬', '德国牧羊犬', '比利时牧羊犬', '澳洲牧羊犬', '柯基犬', '喜乐蒂牧羊犬', '古代英国牧羊犬', '边境牧羊犬', '澳大利亚牧牛犬', '弗兰德牧牛犬', '其他牧羊/牧牛犬'] },
  { group: '第2组：平犬和雪纳瑞类', breeds: ['雪纳瑞（迷你）', '雪纳瑞（标准）', '雪纳瑞（巨型）', '斗牛梗', '波士顿梗', '法国斗牛犬', '英国斗牛犬', '其他平犬'] },
  { group: '第2组：獒犬类和瑞士山地犬', breeds: ['金毛寻回犬', '拉布拉多寻回犬', '罗威纳犬', '圣伯纳犬', '大丹犬', '拳师犬', '杜宾犬', '马士提夫獒犬', '其他獒犬'] },
  { group: '第3组：梗犬类', breeds: ['约克夏梗', '杰克罗素梗', '西高地白梗', '苏格兰梗', '凯利蓝梗', '牛头梗', '贝林顿梗', '其他梗犬'] },
  { group: '第4组：腊肠犬类', breeds: ['短毛腊肠犬', '长毛腊肠犬', '刚毛腊肠犬'] },
  { group: '第5组：原始犬种和雪橇犬', breeds: ['哈士奇', '阿拉斯加雪橇犬', '萨摩耶犬', '松狮犬', '柴犬', '秋田犬', '其他原始/雪橇犬'] },
  { group: '第6组：嗅觉猎犬类', breeds: ['比格犬', '巴吉度猎犬', '寻血猎犬', '其他嗅觉猎犬'] },
  { group: '第7组：指示犬类', breeds: ['德国短毛指示犬', '英国指示犬', '威玛猎犬', '其他指示犬'] },
  { group: '第8组：寻回犬、激飞犬和水猎犬', breeds: ['金毛寻回犬', '拉布拉多寻回犬', '可卡犬', '英国激飞犬', '其他寻回/激飞犬'] },
  { group: '第9组：伴侣犬和玩具犬', breeds: ['贵宾犬（玩具）', '贵宾犬（迷你）', '贵宾犬（标准）', '比熊犬', '马尔济斯', '博美犬', '吉娃娃', '北京犬', '西施犬', '巴哥犬', '其他伴侣/玩具犬'] },
  { group: '第10组：视觉猎犬类', breeds: ['灵缇犬', '惠比特犬', '阿富汗猎犬', '萨路基猎犬', '其他视觉猎犬'] },
  { group: '其他/混血犬', breeds: ['混血犬', '其他未分类犬种'] }
];

// 食材类别列表（可在运行时添加）- 已迁移到后端分类管理
let INGREDIENT_CATEGORIES = [
  '种子', '鱼肉', '营养品', '香料', '水果', '蔬菜', 
  '谷物', '禽肉', '内脏', '菌菇', '坚果', '蛋类', 
  '畜肉', '贝类', '包装'
];

// 分类管理相关变量
let currentCategoryClassification = '食材'; // 当前选中的分类
let categoryManagementData = {
  '食材': [],
  '营养补充剂': [],
  '包材': []
};

// 预设分类数据
const PRESET_CATEGORIES = {
  '食材': [
    '谷类及制品', '薯类、淀粉及制品', '干豆类及制品', '蔬菜类及制品',
    '水果类及制品', '畜肉类及制品', '禽肉类及制品', '乳类及制品',
    '蛋类及制品', '鱼虾蟹贝类', '坚果、种子类', '油脂类', '调味品类'
  ],
  '营养补充剂': [
    '蛋白质类', '维生素类', '矿物质类', '脂肪酸类', '益生菌/益生元类', '功能性补充剂'
  ],
  '包材': [
    '食品真空袋', '产品说明标签', '泡沫箱', '铝箔保温袋', '地址信息标签', '收纳自封袋'
  ]
};

// 类别英文简写映射表
const CATEGORY_ABBREVIATION_MAP = {
  // 食材类别
  '谷类及制品': 'GRAIN',
  '薯类、淀粉及制品': 'STARCH',
  '干豆类及制品': 'BEAN',
  '蔬菜类及制品': 'VEG',
  '水果类及制品': 'FRUIT',
  '畜肉类及制品': 'MEAT',
  '禽肉类及制品': 'POULTRY',
  '乳类及制品': 'DAIRY',
  '蛋类及制品': 'EGG',
  '鱼虾蟹贝类': 'SEAFOOD',
  '坚果、种子类': 'NUT',
  '油脂类': 'OIL',
  '调味品类': 'SPICE',
  '香料、调味类': 'SPICE',  // 新增映射（兼容后端返回的类别名称）
  '菌藻类': 'FUNGI',
  
  // 营养补充剂类别（使用全称）
  '蛋白质类': 'PROTEIN',
  '维生素类': 'VITAMIN',
  '矿物质类': 'MINERAL',
  '脂肪酸类': 'FATTYACID',
  '益生菌/益生元类': 'PROBIOTIC',
  '功能性补充剂': 'FUNCTIONAL',
  
  // 包材类别
  '食品真空袋': 'VACUUMBAG',
  '产品说明标签': 'LABEL',
  '泡沫箱': 'FOAMBOX',
  '铝箔保温袋': 'FOILBAG',
  '地址信息标签': 'ADDRESSLABEL',
  '收纳自封袋': 'ZIPBAG',
  '冰袋': 'ICEBAG'  // 新增映射
};

// 获取分类前缀
function getClassificationPrefix(classification) {
  const prefixMap = {
    '食材': 'ING',
    '营养补充剂': 'SUP',
    '包材': 'PKG'
  };
  return prefixMap[classification] || '';
}

// 获取类别缩写（使用英文简写映射）
function getCategoryAbbreviation(category) {
  if (!category) return '';
  
  // 优先查找映射表
  if (CATEGORY_ABBREVIATION_MAP[category]) {
    return CATEGORY_ABBREVIATION_MAP[category];
  }
  
  // 如果映射表中没有，返回空字符串（需要手动添加映射）
  console.warn('[getCategoryAbbreviation] 类别未找到映射:', category);
  return '';
}

// 自动生成编号（新规则：分类前缀-类别缩写-3位序号）
// 格式：ING-QRL-001, SUP-DBS-001, PKG-BZRQ-001
async function generateIngredientCode(classification, category, excludeId = null) {
  if (!classification || !category) {
    console.warn('[generateIngredientCode] 分类或类别为空');
    return '';
  }
  
  // 所有分类都需要编号（包括包材）
  const prefix = getClassificationPrefix(classification);
  const categoryAbbr = getCategoryAbbreviation(category);
  
  if (!prefix || !categoryAbbr) {
    console.warn('[generateIngredientCode] 无法生成编号：分类或类别无效', { classification, category, prefix, categoryAbbr });
    return '';
  }
  
  // 基础前缀：分类前缀-类别缩写-
  const basePrefix = `${prefix}-${categoryAbbr}-`;
  
  // 从后端加载所有原料数据（不限制分页），然后在客户端过滤
  // 避免使用筛选参数可能导致的 CORS 问题
  let allIngredients = [];
  let allCodesForDuplicateCheck = [];
  
  if (backendState.token) {
    try {
      // 直接获取所有数据，避免使用筛选参数可能导致的 CORS 问题
      const data = await backendRequest('/api/v1/ingredients?pageSize=10000');
      const rawItems = data.items || [];
      
      // 转换为前端格式，并过滤出相同分类+类别的原料
      allIngredients = rawItems
        .filter(ing => ing.classification === classification && ing.category === category)
        .map(ing => ({
          id: `ing_${ing.id}`,
          code: ing.code || '',
          classification: ing.classification || '',
          category: ing.category || ''
        }));
      
      // 用于全局查重的所有编号数据
      allCodesForDuplicateCheck = rawItems.map(ing => ({
        id: `ing_${ing.id}`,
        code: ing.code || ''
      }));
      
      console.log(`[generateIngredientCode] 从后端加载了 ${rawItems.length} 条原料，其中 ${allIngredients.length} 条符合分类+类别条件`);
    } catch (error) {
      console.warn('[generateIngredientCode] 从后端加载数据失败，使用本地数据:', error);
      // 如果后端加载失败，回退到使用 store.ingredients，并过滤相同分类+类别
      allIngredients = store.ingredients.filter(ing => 
        ing.classification === classification && ing.category === category
      );
      allCodesForDuplicateCheck = store.ingredients;
    }
  } else {
    // 未登录时使用本地数据，并过滤相同分类+类别
    allIngredients = store.ingredients.filter(ing => 
      ing.classification === classification && ing.category === category
    );
    allCodesForDuplicateCheck = store.ingredients;
  }
  
  // 找到相同分类+类别的所有原料，计算下一个序号（排除当前编辑的原料）
  const sameClassificationCategory = allIngredients.filter(ing => {
    if (excludeId && ing.id === excludeId) return false;
    return true; // 已经在上一步过滤过了
  });
  
  // 找到相同分类+类别的最大序号
  let maxNum = 0;
  sameClassificationCategory.forEach(ing => {
    if (ing.code && ing.code.startsWith(basePrefix)) {
      // 匹配格式：ING-QRL-001
      // 转义特殊字符，避免正则表达式错误
      const escapedPrefix = basePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = ing.code.match(new RegExp(`^${escapedPrefix}(\\d{3})$`));
      if (match) {
        const num = parseInt(match[1], 10);
        maxNum = Math.max(maxNum, num);
      }
    }
  });
  
  // 计算下一个序号
  let nextNum = maxNum + 1;
  
  // 如果超过999，从001重新开始查找（理论上不应该发生）
  if (nextNum > 999) {
    console.warn('[generateIngredientCode] 序号超过999，从001重新查找');
    nextNum = 1;
  }
  
  let code = basePrefix + String(nextNum).padStart(3, '0');
  
  // 检查是否有重复（全局检查，包括不同分类+类别的原料）
  // 使用自动递增序号机制
  while (allCodesForDuplicateCheck.some(ing => {
    if (excludeId && ing.id === excludeId) return false;
    return ing.code && ing.code.trim().toUpperCase() === code.trim().toUpperCase();
  })) {
    nextNum++;
    if (nextNum > 999) {
      console.error('[generateIngredientCode] 无法生成唯一编号，序号已超过999');
      return ''; // 返回空，让用户知道有问题
    }
    code = basePrefix + String(nextNum).padStart(3, '0');
  }
  
  console.log('[generateIngredientCode] 生成编号:', code, { classification, category, nextNum });
  return code;
}

// 创建备份
function createBackup(data) {
  try {
    const backups = getBackups();
    const backup = {
      id: 'backup_' + Date.now(),
      timestamp: Date.now(),
      date: new Date().toLocaleString('zh-CN'),
      data: data,
      customersCount: data.customers ? data.customers.length : 0,
      ingredientsCount: data.ingredients ? data.ingredients.length : 0,
      recipesCount: data.recipes ? data.recipes.length : 0,
      ordersCount: data.orders ? data.orders.length : 0
    };
    
    backups.unshift(backup); // 最新的在前面
    
    // 只保留最近的MAX_BACKUPS个备份
    if (backups.length > MAX_BACKUPS) {
      backups.splice(MAX_BACKUPS);
    }
    
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(backups));
    console.log('✓ 自动备份已创建:', backup.id, backup.date);
    return true;
  } catch (error) {
    console.warn('创建备份失败（不影响主数据保存）:', error);
    return false;
  }
}

// 获取备份列表
function getBackups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BACKUPS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('读取备份列表失败:', error);
  }
  return [];
}

// 删除备份
function deleteBackup(backupId) {
  try {
    const backups = getBackups();
    const filtered = backups.filter(b => b.id !== backupId);
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(filtered));
    console.log('备份已删除:', backupId);
    return true;
  } catch (error) {
    console.error('删除备份失败:', error);
    return false;
  }
}

// 恢复备份
function restoreBackup(backupId) {
  try {
    const backups = getBackups();
    const backup = backups.find(b => b.id === backupId);
    if (!backup || !backup.data) {
      alert('备份数据无效');
      return false;
    }
    
    if (confirm(`确定要恢复到 ${backup.date} 的备份吗？当前数据将被替换。`)) {
      store.customers = Array.isArray(backup.data.customers) ? backup.data.customers : [];
      // store.ingredients = Array.isArray(backup.data.ingredients) ? backup.data.ingredients : []; // 原料数据已迁移到后端
      store.recipes = Array.isArray(backup.data.recipes) ? backup.data.recipes : [];
      
              // 保存恢复的数据
      if (saveAppWithoutBackup()) {
        alert('恢复成功！');
        renderCustomersList();
        // renderIngredientsList(); // 原料数据已迁移到后端，需要从后端加载
        if (backendState.token) {
          loadIngredientsFromBackend();
        }
        renderRecipesList();
        renderBackupsList(); // 刷新备份列表
        return true;
      } else {
        alert('恢复失败，数据保存出错');
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('恢复备份失败:', error);
    alert('恢复失败：' + error.message);
    return false;
  }
}

// 保存数据（不创建备份，用于恢复时避免循环备份）
function saveAppWithoutBackup() {
  try {
    const dataToSave = { 
      customers: store.customers,
      // ingredients: store.ingredients, // 原料数据已迁移到后端，不再保存到本地
      recipes: store.recipes,
      orders: store.orders
    };
    const jsonStr = JSON.stringify(dataToSave);
    
    localStorage.setItem(STORAGE_KEY_APP, jsonStr);
    
    const verify = localStorage.getItem(STORAGE_KEY_APP);
    if (verify === jsonStr) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('保存数据失败:', error);
    return false;
  }
}

function saveApp() {
  try {
    const dataToSave = { 
      customers: store.customers,
      // ingredients: store.ingredients, // 原料数据已迁移到后端，不再保存到本地
      recipes: store.recipes,
      orders: store.orders
    };
    const jsonStr = JSON.stringify(dataToSave);
    
    // 检查存储空间
    if (jsonStr.length > 5 * 1024 * 1024) { // 5MB
      console.warn('数据较大:', (jsonStr.length / 1024).toFixed(2), 'KB');
    }
    
    // 保存当前数据前，先备份
    const currentData = localStorage.getItem(STORAGE_KEY_APP);
    if (currentData && currentData !== jsonStr) {
      try {
        const currentParsed = JSON.parse(currentData);
        createBackup(currentParsed);
      } catch (e) {
        // 如果当前数据无法解析，跳过备份
      }
    }
    
    localStorage.setItem(STORAGE_KEY_APP, jsonStr);
    
    // 验证保存是否成功
    const verify = localStorage.getItem(STORAGE_KEY_APP);
    if (verify === jsonStr) {
      console.log('✓ 保存数据成功 - 顾客:', store.customers.length, '原料:', store.ingredients.length, '食谱:', store.recipes.length);
      console.log('✓ 存储键:', STORAGE_KEY_APP, '数据大小:', (jsonStr.length / 1024).toFixed(2), 'KB');
      return true;
    } else {
      console.error('✗ 保存验证失败：数据不一致');
      return false;
    }
  } catch (error) {
    console.error('✗ 保存数据失败:', error);
    
    // 检查是否是存储空间不足
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      alert('存储空间不足！请清除浏览器缓存或导出数据后删除一些记录。');
    } else {
      alert('保存数据失败：' + error.message);
    }
    return false;
  }
}

function loadApp() {
  try {
    // 列出所有localStorage键用于调试
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('pff-') || key.includes('customer') || key.includes('app'))) {
        allKeys.push(key);
        console.log('发现相关key:', key, '长度:', localStorage.getItem(key)?.length || 0);
      }
    }
    
    // 先尝试加载新版本
    const raw = localStorage.getItem(STORAGE_KEY_APP);
    if (raw && raw.length > 2) { // 至少是 "{}" 的长度
      try {
        const data = JSON.parse(raw);
        store.customers = Array.isArray(data.customers) ? data.customers : [];
        // store.ingredients = Array.isArray(data.ingredients) ? data.ingredients : []; // 原料数据已迁移到后端，不再从本地加载
        store.recipes = Array.isArray(data.recipes) ? data.recipes : [];
        store.orders = Array.isArray(data.orders) ? data.orders : [];
        console.log('加载数据成功 - 顾客:', store.customers.length, '食谱:', store.recipes.length);
        if (store.customers.length > 0 || store.recipes.length > 0) {
          return;
        }
      } catch (parseError) {
        console.error('解析数据失败:', parseError, '原始数据:', raw.substring(0, 200));
      }
    }
    
    // 尝试加载旧版本（向后兼容）
    const oldKeys = ['pff-app-v1', 'pff-app'];
    for (const oldKey of oldKeys) {
      const oldRaw = localStorage.getItem(oldKey);
      if (oldRaw && oldRaw.length > 2) {
        try {
          const oldData = JSON.parse(oldRaw);
          if (Array.isArray(oldData.customers)) {
            store.customers = oldData.customers;
            // store.ingredients = Array.isArray(oldData.ingredients) ? oldData.ingredients : []; // 原料数据已迁移到后端
            store.recipes = Array.isArray(oldData.recipes) ? oldData.recipes : [];
            // 迁移到新key
            saveApp();
            console.log('从旧版本迁移数据成功 - 顾客:', store.customers.length);
            return;
          }
        } catch (parseError) {
          console.error('解析旧数据失败:', parseError);
        }
      }
    }
    
    // 如果完全没有数据，初始化空数组
    store.customers = [];
    store.ingredients = [];
    store.recipes = [];
    if (allKeys.length === 0) {
      console.log('初始化空数据 - 未找到任何相关存储键');
    } else {
      console.log('初始化空数据 - 但发现以下键:', allKeys.join(', '));
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    // 即使出错也保持空数组，避免崩溃
    store.customers = [];
    store.ingredients = [];
    store.recipes = [];
  }
}

function genId() { return 'id_' + Math.random().toString(36).slice(2, 9); }

function switchView(view) {
  console.log('切换视图到:', view);
  // 保存当前视图到localStorage
  try {
    localStorage.setItem('pff-current-view', view);
  } catch (e) {
    console.warn('保存当前视图失败:', e);
  }
  
  // 更新导航按钮的active状态
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === view) {
      btn.classList.add('active');
    }
  });
  
  document.querySelectorAll('.view').forEach(v => {
    v.style.display = 'none';
    v.removeAttribute('style');
  });
  const el = document.getElementById(`view-${view}`);
  if (el) {
    el.setAttribute('style', 'display: block !important');
    console.log('视图元素:', el, '显示状态:', el.style.display);
    // 如果切换到原料视图，从后端加载数据
    if (view === 'inventory') {
      // 延迟初始化模块（如果还没有初始化）
      setTimeout(() => {
        try {
          // 检查是否已经初始化，如果没有则初始化
          const newBtn = $('btn-new-ingredient');
          if (newBtn && !newBtn.hasAttribute('data-initialized')) {
            setupIngredientsModule();
            newBtn.setAttribute('data-initialized', 'true');
          }
        } catch (error) {
          console.error('[switchView] 初始化原料模块失败:', error);
        }
      }, 50);
      
      setTimeout(async () => {
        try {
          await loadIngredientsFromBackend(); // 函数内部会处理未登录的情况
          if (backendState.token) {
            await loadAllIngredientsForFilters(); // 加载所有数据填充筛选下拉框
          } else {
            updateIngredientFilterSelects(); // 未登录时使用本地数据
          }
        } catch (error) {
          console.error('[switchView] 加载原料数据失败:', error);
        }
      }, 100);
    }
    
    // 如果切换到食谱视图，从后端加载数据
    if (view === 'recipes') {
      setTimeout(async () => {
        try {
          await loadRecipesFromBackend(); // 函数内部会处理未登录的情况
        } catch (error) {
          console.error('[switchView] 加载食谱数据失败:', error);
        }
      }, 100);
    }
    // 如果切换到顾客视图，从后端加载数据
    if (view === 'customers') {
      setTimeout(async () => {
        try {
          await loadCustomersFromBackend(); // 函数内部会处理未登录的情况
        } catch (error) {
          console.error('[switchView] 加载顾客数据失败:', error);
        }
      }, 100);
    }
    // 如果切换到品种管理视图，加载数据
    if (view === 'breeds') {
      setTimeout(async () => {
        try {
          await loadBreeds(); // 函数内部会处理未登录的情况
          await loadBreedCategories();
          renderBreedsList();
        } catch (error) {
          console.error('[switchView] 加载品种数据失败:', error);
        }
      }, 100);
    }
    // 如果切换到设置视图，刷新备份列表
    if (view === 'settings') {
      setTimeout(() => renderBackupsList(), 100);
    }
    // 如果切换到订单视图，重新渲染列表
    if (view === 'orders') {
      setTimeout(() => {
        renderOrdersList();
      }, 100);
    }
  } else {
    console.error('找不到视图元素: view-' + view);
  }
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
}

function estimateRestingEnergyRequirementKg(weightKg) {
  const w = Math.max(0, Number(weightKg) || 0);
  if (w === 0) return 0;
  return 70 * Math.pow(w, 0.75);
}

function activityMultiplier(activity) {
  // 与小程序端保持一致：使用能量系数（kcal factor）
  // 小程序端：low=95, medium=110, high=125, very_high=150
  // 这里保留旧函数以兼容，但实际使用 activityKcalFactor
  switch (activity) {
    case 'low': return 95 / 100; // 转换为倍数形式（兼容旧代码）
    case 'medium': return 110 / 100;
    case 'high': return 125 / 100;
    case 'very_high': return 150 / 100;
    default: return 110 / 100; // 默认中等运动量
  }
}

function activityKcalFactor(activity) {
  // 与小程序端保持一致
  // 小程序端 ACTIVITY_OPTIONS:
  // low: 95, medium: 110, high: 125, very_high: 150
  switch (activity) {
    case 'low': return 95;
    case 'medium': return 110;
    case 'high': return 125;
    case 'very_high': return 150;
    default: return 110; // 默认中等运动量
  }
}
function calcAgeYears(birthdayStr) {
  if (!birthdayStr) return null;
  const b = new Date(birthdayStr);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  return (now - b) / (365.25 * 24 * 3600 * 1000);
}

function calcAgeMonths(birthdayStr) {
  if (!birthdayStr) return null;
  const b = new Date(birthdayStr);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  return months;
}

function monthFactorFromMonths(m) {
  // 与小程序端 calculateKValue 保持一致
  if (m == null) return null;
  if (m < 2) return 2;        // 修复：月龄 < 2 时应该是 2，不是 1.8
  if (m === 2) return 1.8;
  if (m === 3) return 1.6;
  if (m === 4) return 1.5;
  if (m === 5) return 1.4;
  if (m === 6) return 1.3;
  if (m === 7) return 1.2;
  if (m === 8) return 1.1;
  return 1.0;  // 月龄 > 8
}

function lactFactorFromStage(stage) {
  switch (stage) {
    case 'week1': return 0.75;
    case 'week2': return 0.95;
    case 'week3': return 1.1;
    case 'week4': return 1.2;
    default: return 1.0;
  }
}

// 使用共享工具库更新生命阶段
function updateLifeStageFromBirthday() {
  if (typeof PetUtils === 'undefined' || !PetUtils) {
    // 回退到旧逻辑
    autoSetLifeStageFromBirthday();
    return;
  }
  
  const birthdate = $('c-birthday').value;
  if (!birthdate) return;
  
  // 获取品种数据（如果有）
  const breedSelect = $('c-breed');
  const breedName = breedSelect ? breedSelect.value : '';
  // TODO: 从后端获取品种的成熟月龄，这里暂时使用默认值12
  const maturityMonths = 12;
  
  const lifeStage = PetUtils.determineLifeStage(birthdate, maturityMonths);
  const lifeSel = $('c-lifeStage');
  if (lifeSel) {
    lifeSel.value = lifeStage;
    
    // 更新生命阶段描述
    const petName = $('c-petName') ? $('c-petName').value : '';
    const description = PetUtils.generateLifeStageDescription(petName, breedName, maturityMonths, birthdate, lifeStage);
    const descEl = $('life-stage-description');
    if (descEl) {
      descEl.textContent = description;
    }
  }
  
  updatePuppyMonthFields();
}

function autoSetLifeStageFromBirthday() {
  const lifeSel = $('c-lifeStage');
  const years = calcAgeYears($('c-birthday').value);
  if (years == null) return;
  // 小程序端只有 puppy 和 adult 两个选项
  if (years < 1) lifeSel.value = 'puppy';
  else lifeSel.value = 'adult';
  updatePuppyMonthFields();
}

function updatePuppyMonthFields() {
  const isPuppy = $('c-lifeStage').value === 'puppy';
  const wrapAge = $('wrap-monthAge');
  const wrapFactor = $('wrap-monthFactor');
  if (wrapAge) wrapAge.style.display = isPuppy ? '' : 'none';
  if (wrapFactor) wrapFactor.style.display = isPuppy ? '' : 'none';
  if (!isPuppy) return;
  const months = calcAgeMonths($('c-birthday').value);
  const factor = monthFactorFromMonths(months);
  if ($('c-monthAge')) $('c-monthAge').value = months != null ? months : '';
  if ($('c-monthFactor')) $('c-monthFactor').value = factor != null ? factor : '';
}

function updateLactationFields() {
  const isLact = $('c-lifeStage').value === 'lactation';
  const w1 = $('wrap-lactStage');
  const w2 = $('wrap-lactFactor');
  const w3 = $('wrap-litterCount');
  if (w1) w1.style.display = isLact ? '' : 'none';
  if (w2) w2.style.display = isLact ? '' : 'none';
  if (w3) w3.style.display = isLact ? '' : 'none';
  if (!isLact) return;
  const stage = $('c-lactStage').value;
  $('c-lactFactor').value = lactFactorFromStage(stage);
}

function setEstHint(text) {
  const el = $('estKcalHint');
  if (el) el.textContent = text || '';
}

function computeAndFillEstKcal() {
  const estEl = $('c-estKcal');
  if (!estEl) return;
  const w = Number($('c-weightKg').value) || 0;
  if (w <= 0) { estEl.value = ''; setEstHint(''); return; }
  
  // 优先使用共享工具库
  if (typeof PetUtils !== 'undefined' && PetUtils) {
    const life = $('c-lifeStage').value;
    const kcalFactor = Number($('c-kcalFactor').value) || 0;
    if (!kcalFactor) {
      estEl.value = '';
      setEstHint('请先选择活动水平');
      return;
    }
    
    const birthdate = $('c-birthday').value;
    const ageMonths = birthdate ? PetUtils.calculateAgeMonths(birthdate) : null;
    
    const energy = PetUtils.calculateEnergy(w, kcalFactor, life, ageMonths);
    if (energy !== '') {
      estEl.value = energy;
      if (life === 'puppy') {
        const k = PetUtils.calculateKValue(ageMonths);
        setEstHint(`幼年期：${w}^0.75 × ${kcalFactor} × K值${k} = ${energy} kcal`);
      } else {
        setEstHint(`成年期：${w}^0.75 × ${kcalFactor} = ${energy} kcal`);
      }
    } else {
      estEl.value = '';
      setEstHint('');
    }
    return;
  }
  
  // 回退到旧逻辑
  const life = $('c-lifeStage').value;
  const kcalFactor = Number($('c-kcalFactor').value) || activityKcalFactor($('c-activity').value);
  if (life === 'puppy') {
    let monthFactor = Number($('c-monthFactor').value);
    if (!monthFactor) {
      const months = calcAgeMonths($('c-birthday').value);
      monthFactor = monthFactorFromMonths(months) || 1;
    }
    const val = Math.round(Math.pow(w, 0.75) * kcalFactor * monthFactor);
    estEl.value = val;
    setEstHint(`幼年期：${w}^0.75 × 热量系数${kcalFactor} × 月龄系数${monthFactor}`);
  } else if (life === 'adult') {
    const val = Math.round(Math.pow(w, 0.75) * kcalFactor);
    estEl.value = val;
    setEstHint(`成年期：${w}^0.75 × 热量系数${kcalFactor}`);
  } else {
    const rer = estimateRestingEnergyRequirementKg(w);
    const mult = activityMultiplier($('c-activity').value);
    const val = Math.round(rer * mult);
    estEl.value = val;
    setEstHint(`其他：RER(70×${w}^0.75) × 活动乘数${mult}`);
  }
}

// 填充品种下拉框
// 从后端API加载品种数据（与小程序端一致）
async function populateBreedSelect() {
  const select = $('c-breed');
  if (!select) return;
  
  // 先显示加载状态
  select.innerHTML = '<option value="">加载中...</option>';
  
  // 如果没有登录，直接使用本地数据，不调用API
  if (!backendState.token) {
    console.log('未登录，使用本地品种数据');
    select.innerHTML = '<option value="">请选择品种</option>';
    CKU_BREEDS.forEach(group => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.group;
      group.breeds.forEach(breed => {
        const option = document.createElement('option');
        option.value = breed;
        option.textContent = breed;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    });
    return;
  }
  
  try {
    // 从后端API加载品种数据
    const response = await backendRequest('/api/v1/breeds', {
      method: 'GET'
    });
    
    console.log('品种API响应:', response, '类型:', typeof response);
    
    // 后端返回格式可能是 { items: [...], total: X } 或直接是数组
    // 注意：backendRequest 已经自动解包了 {success: true, data: {...}} 格式
    let breedsArray = [];
    if (Array.isArray(response)) {
      breedsArray = response;
    } else if (response && typeof response === 'object') {
      // 检查 response.items 是否存在且是数组
      if (Array.isArray(response.items)) {
        breedsArray = response.items;
      } else if (response.data && Array.isArray(response.data.items)) {
        breedsArray = response.data.items;
      } else if (Array.isArray(response.data)) {
        breedsArray = response.data;
      }
    }
    
    console.log('解析后的品种数组:', breedsArray, '长度:', breedsArray.length);
    if (breedsArray.length > 0) {
      console.log('第一个品种对象示例:', breedsArray[0]);
      // 检查对象结构
      if (breedsArray[0] && typeof breedsArray[0] === 'object') {
        console.log('品种对象属性:', Object.keys(breedsArray[0]));
      }
    }
    
    if (breedsArray.length === 0) {
      console.warn('品种数据为空，可能的原因：1. 数据库中没有品种数据；2. API返回格式不正确；3. API调用失败');
    }
    
    // 清空并添加选项
    select.innerHTML = '<option value="">请选择品种</option>';
    
    // 添加"其它品种"选项
    const otherOption = document.createElement('option');
    otherOption.value = '其它品种';
    otherOption.textContent = '其它品种';
    select.appendChild(otherOption);
    
    // 监听品种选择变化，显示/隐藏手动输入框
    const otherBreedInput = $('c-breed-other');
    if (otherBreedInput) {
      select.addEventListener('change', () => {
        if (select.value === '其它品种') {
          otherBreedInput.style.display = 'block';
          otherBreedInput.required = true;
          otherBreedInput.focus();
        } else {
          otherBreedInput.style.display = 'none';
          otherBreedInput.required = false;
          otherBreedInput.value = '';
        }
      });
    }
    
    // 按分类组织品种（与小程序端一致）
    const breedsByCategory = {};
    breedsArray.forEach(breed => {
      // 确保breed是对象且有必要的属性
      if (!breed || typeof breed !== 'object') {
        console.warn('无效的品种对象:', breed);
        return;
      }
      const category = breed.category || '其他';
      const name = breed.name;
      if (!name) {
        console.warn('品种对象缺少name属性:', breed);
        return;
      }
      if (!breedsByCategory[category]) {
        breedsByCategory[category] = [];
      }
      breedsByCategory[category].push(name);
    });
    
    // 按分类添加选项
    Object.keys(breedsByCategory).sort().forEach(category => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;
      breedsByCategory[category].sort().forEach(breedName => {
        const option = document.createElement('option');
        option.value = breedName;
        option.textContent = breedName;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    });
    
    console.log(`✓ 已加载 ${breedsArray.length} 个品种选项（${Object.keys(breedsByCategory).length} 个分类）`);
  } catch (error) {
    // 如果API失败，回退到本地数据（不显示错误，因为这是预期的回退行为）
    const errorMsg = error.message || '未知错误';
    if (errorMsg.includes('404')) {
      console.log('品种API不存在，使用本地数据');
    } else {
      console.warn('加载品种数据失败，使用本地数据:', errorMsg);
    }
    select.innerHTML = '<option value="">请选择品种</option>';
    CKU_BREEDS.forEach(group => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.group;
      group.breeds.forEach(breed => {
        const option = document.createElement('option');
        option.value = breed;
        option.textContent = breed;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    });
  }
}
function zh(val, map) { return map[val] || val || '-'; }
const sexMap = { male: '公', female: '母', unknown: '未知' };
const neuterMap = { yes: '是', no: '否', unknown: '未知' };
const lifeMap = { puppy: '幼年期', adult: '成年期' };
const actMap = { 
  low: '低运动量（＜1小时/天，例如牵绳散步）', 
  medium: '中等运动量（1-3小时/天，例如散步+室内玩耍）', 
  high: '较高运动量（1-3小时/天，例如跑跳、追逐等）', 
  very_high: '高运动量（3-6小时/天，例如牧羊等工作）' 
};
const lactMap = { week1: '第一周', week2: '第二周', week3: '第三周', week4: '第四周' };
const recipeTypeLabelMap = { standard: '通用食谱', custom: '定制食谱' };
const nutritionLabelMap = { AAFCO: 'AAFCO', FEDIAF: 'FEDIAF', NRC: 'NRC' };

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value && value !== 0) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatFileTimestamp(date = new Date()) {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function formatAgeDisplay(customer) {
  if (!customer) return '-';
  const months = calcAgeMonths(customer.birthday);
  if (months == null) return '-';
  if (months < 12) return `${months}个月`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return `${years}岁`;
  return `${years}岁${rest}个月`;
}

function formatMultiline(value) {
  if (!value) return '-';
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function formatNumber(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toFixed(digits);
}

function formatPercentInteger(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `${Math.round(num)}%`;
}

function formatCurrency(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `¥${num.toFixed(digits)}`;
}

function formatWeight(value, digits = 2, unit = 'g') {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `${num.toFixed(digits)} ${unit}`;
}

function buildDetailTable(rows) {
  if (!rows || rows.length === 0) {
    return '<div class="detail-empty">暂无数据</div>';
  }
  const body = rows.map(row => {
    const label = escapeHtml(row.label || '-');
    const raw = row.raw === true;
    let value;
    if (row.value == null || row.value === '') {
      value = '-';
    } else {
      value = raw ? row.value : escapeHtml(row.value);
    }
    return `<tr><th>${label}</th><td>${value}</td></tr>`;
  }).join('');
  return `<table class="detail-table"><tbody>${body}</tbody></table>`;
}

function buildDetailGrid(rows, options = {}) {
  if (!rows || rows.length === 0) {
    return '<div class="detail-empty">暂无数据</div>';
  }
  const columns = options.columns || 2;
  const compact = options.compact ? ' compact' : '';
  const items = rows.map(row => {
    const label = escapeHtml(row.label || '-');
    const raw = row.raw === true;
    let value;
    if (row.value == null || row.value === '') {
      value = '-';
    } else {
      value = raw ? row.value : escapeHtml(row.value);
    }
    return `<div class="detail-grid-item"><div class="detail-grid-label">${label}</div><div class="detail-grid-value">${value}</div></div>`;
  }).join('');
  return `<div class="detail-grid${compact}" style="--detail-grid-columns:${columns};">${items}</div>`;
}

function getEstKcalInfo(customer) {
  if (!customer) return { valueText: '-', formulaText: '-' };
  const estKcal = customer.estKcal;
  const weight = Number(customer.weightKg) || 0;
  const kcalFactor = Number(customer.kcalFactor) || activityKcalFactor(customer.activity);
  const weightPart = `${weight || '体重'}^0.75 × 热量系数${kcalFactor}`;
  let formula = weightPart;
  if (customer.lifeStage === 'puppy') {
    const monthFactor = customer.monthFactor != null ? customer.monthFactor : monthFactorFromMonths(calcAgeMonths(customer.birthday));
    if (monthFactor != null) {
      formula = `${weightPart} × 月龄系数${monthFactor}`;
    }
  // 小程序端只有 puppy 和 adult 两个选项，不再需要处理 pregnancy
  } else if (customer.lifeStage === 'lactation') {
    const litter = customer.litterCount != null ? customer.litterCount : 0;
    const N = Math.min(litter, 4);
    const M = litter > 4 ? (litter - 4) : 0;
    const stageFactor = customer.lactFactor != null ? customer.lactFactor : lactFactorFromStage(customer.lactStage);
    formula = `${weightPart} + ${weight || '体重'} × (24×${N} + 12×${M}) × 阶段因子${stageFactor}`;
  }
  const valueText = (estKcal != null && estKcal !== '') ? `${estKcal} kcal/日` : '-';
  return { valueText, formulaText: formula };
}

function describeEstKcal(customer) {
  const info = getEstKcalInfo(customer);
  return `${escapeHtml(info.valueText)}<div class="detail-hint">计算公式：${escapeHtml(info.formulaText)}</div>`;
}

function buildQuoteCustomerSummary(customer) {
  if (!customer) return '<div class="detail-empty">未找到顾客信息</div>';
  const rows = [
    { label: '宠物昵称', value: customer.petName || '-' },
    { label: '品种', value: customer.breed || '-' },
    { label: '年龄/月龄', value: formatAgeDisplay(customer) },
    { label: '体重', value: customer.weightKg != null ? `${formatNumber(customer.weightKg, 2)} kg` : '-' },
    { label: '每日吃几顿饭', value: customer.mealsPerDay != null ? customer.mealsPerDay : '-' },
    { label: '日均活动水平', value: customer.activity ? `${zh(customer.activity, actMap)}（热量系数 ${customer.kcalFactor != null ? customer.kcalFactor : activityKcalFactor(customer.activity)}）` : '-' },
    { label: '挑食/尽量不吃', value: formatMultiline(customer.avoid), raw: true },
    { label: '过敏/不耐受', value: formatMultiline(customer.allergies), raw: true },
    { label: '非常喜欢吃', value: formatMultiline(customer.fav), raw: true }
  ];
  const { valueText } = getEstKcalInfo(customer);
  const infoHtml = rows.map(row => {
    const label = escapeHtml(row.label || '-');
    let value;
    if (row.raw) {
      value = row.value || '-';
    } else {
      value = escapeHtml(row.value != null && row.value !== '' ? row.value : '-');
    }
    return `<div class="quote-summary-grid-item"><div class="quote-summary-label">${label}</div><div class="quote-summary-value">${value}</div></div>`;
  }).join('');
  return `
    <div class="quote-summary-card">
      <div class="quote-section-header">
        <h3 class="quote-section-title">毛孩子基本信息</h3>
      </div>
      <div class="quote-summary-info">
        <div class="quote-summary-grid">
          ${infoHtml}
        </div>
      </div>
      <div class="quote-energy-highlight">
        <div class="quote-energy-label">每日能量估算</div>
        <div class="quote-energy-value">${escapeHtml(valueText)}</div>
      </div>
    </div>
  `;
}

function openQuoteRecipeSelector(customerId) {
  const customer = store.customers.find(c => c.id === customerId);
  if (!customer) {
    alert('未找到该顾客信息，请刷新后重试');
    return;
  }
  currentQuoteCustomerId = customerId;
  currentQuoteRenderState = null;
  resetQuoteOverrides();
  currentQuoteSelectedRecipeIds = new Set();
  quoteRecipeFilter = { search: '', lifeStage: '' };
  const selectCard = $('quote-select-card');
  const summaryEl = $('quote-customer-summary');
  const searchEl = $('quote-recipe-search');
  const lifeStageEl = $('quote-lifeStage-filter');
  const resultCard = $('quote-result-card');
  if (resultCard) {
    resultCard.style.display = 'none';
    const content = $('quote-result-content');
    if (content) content.innerHTML = '';
  }
  if (summaryEl) summaryEl.innerHTML = buildQuoteCustomerSummary(customer);
  if (searchEl) searchEl.value = '';
  if (lifeStageEl) lifeStageEl.value = customer.lifeStage || '';
  quoteRecipeFilter.lifeStage = lifeStageEl ? lifeStageEl.value || '' : '';
  renderQuoteRecipeList();
  if (selectCard) {
    selectCard.style.display = 'block';
    selectCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function closeQuoteRecipeSelector() {
  const selectCard = $('quote-select-card');
  if (selectCard) selectCard.style.display = 'none';
  currentQuoteCustomerId = null;
  currentQuoteSelectedRecipeIds = new Set();
}

function updateQuoteSelectedInfo() {
  const infoEl = $('quote-selected-info');
  if (infoEl) {
    infoEl.textContent = `已选择 ${currentQuoteSelectedRecipeIds.size} 个食谱`;
  }
}

function renderQuoteRecipeList() {
  const listEl = $('quote-recipe-list');
  if (!listEl) return;
  const search = (quoteRecipeFilter.search || '').toLowerCase();
  const lifeStage = quoteRecipeFilter.lifeStage || '';
  const filtered = store.recipes.filter(recipe => {
    const matchSearch = !search || `${recipe.name || ''}${recipe.code || ''}`.toLowerCase().includes(search);
    const matchLifeStage = !lifeStage || recipe.lifeStage === lifeStage;
    return matchSearch && matchLifeStage;
  });
  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="detail-empty">暂无符合条件的食谱，请调整筛选条件</div>';
  } else {
    listEl.innerHTML = filtered.map(recipe => {
      const checked = currentQuoteSelectedRecipeIds.has(recipe.id) ? 'checked' : '';
      const lifeStageLabel = zh(recipe.lifeStage, lifeMap);
      const typeLabel = recipeTypeLabelMap[recipe.recipeType] || '-';
      const nutritionLabel = nutritionLabelMap[recipe.nutritionStandard] || (recipe.nutritionStandard || '-');
      return `
        <div class="quote-recipe-item">
          <div class="quote-recipe-meta">
            <strong>${escapeHtml(recipe.name || '-')}</strong>
            <span class="muted">编号：${escapeHtml(recipe.code || '-')}</span>
            <span class="muted">生命阶段：${escapeHtml(lifeStageLabel)} ｜ 营养标准：${escapeHtml(nutritionLabel)} ｜ 类型：${escapeHtml(typeLabel)}</span>
          </div>
          <label class="quote-check">
            <input type="checkbox" value="${recipe.id}" ${checked} />
          </label>
        </div>
      `;
    }).join('');
    listEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = e.target.value;
        if (e.target.checked) {
          currentQuoteSelectedRecipeIds.add(id);
        } else {
          currentQuoteSelectedRecipeIds.delete(id);
        }
        updateQuoteSelectedInfo();
      });
    });
  }
  updateQuoteSelectedInfo();
}

function calculateQuoteBaseData(recipe, customer) {
  const mealsPerDay = customer && customer.mealsPerDay > 0 ? customer.mealsPerDay : 1;
  const estKcal = customer && customer.estKcal > 0 ? customer.estKcal : 0;
  const recipeTotalKcal = recipe && recipe.totalKcal > 0 ? recipe.totalKcal : 0;
  const ratio = (estKcal > 0 && recipeTotalKcal > 0 && mealsPerDay > 0) ? (estKcal / recipeTotalKcal) : 0;
  const servingWeight = ratio > 0 ? ((recipe.totalWeight || 0) * ratio / mealsPerDay) : 0;
  const totalWeightPerDay = servingWeight * mealsPerDay;
  const ingredientDetails = calculateQuoteIngredientDetails(recipe, ratio, mealsPerDay, totalWeightPerDay);
  return { ratio, mealsPerDay, estKcal, recipeTotalKcal, servingWeight, totalWeightPerDay, ingredientDetails };
}

function calculateQuoteIngredientDetails(recipe, ratio, mealsPerDay, totalWeightPerDay) {
  const details = [];
  const ingredientsList = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  ingredientsList.forEach((item, idx) => {
    // 使用保存的食材名称（新格式）或从ingredientId查找（兼容旧格式）
    let ingredientName = item.ingredientName || '';
    let category = '-';
    let brand = '-';
    let mainFunction = '-';
    let unit = item.unit || 'g';
    
    // 如果使用旧格式（有ingredientId），尝试从store中查找
    if (!ingredientName && item.ingredientId) {
      const ingredient = store.ingredients.find(i => {
        if (typeof item.ingredientId === 'number') {
          return i._backendId === item.ingredientId;
        } else if (typeof item.ingredientId === 'string') {
          return i.id === item.ingredientId || i._backendId === parseInt(item.ingredientId.replace('ing_', ''), 10);
        }
        return false;
      });
      if (ingredient) {
        ingredientName = ingredient.name || '';
        category = ingredient.category || '-';
        brand = ingredient.brand || ingredient.source || '-';
        mainFunction = ingredient.mainFunction || '-';
        unit = item.unit || ingredient.unit || 'g';
      }
    } else if (ingredientName) {
      // 新格式：只有名称，尝试从store中查找匹配的食材（用于获取其他信息）
      // 注意：可能有多个同名食材，这里只取第一个匹配的
      const ingredient = store.ingredients.find(i => i.name === ingredientName && i.classification === '食材');
      if (ingredient) {
        category = ingredient.category || '-';
        brand = ingredient.brand || ingredient.source || '-';
        mainFunction = ingredient.mainFunction || '-';
        unit = item.unit || ingredient.unit || 'g';
      }
    }
    let totalAmount = 0;
    if (ratio > 0) {
      const singleServingsAmount = mealsPerDay > 0 ? (item.weight * ratio / mealsPerDay) : 0;
      totalAmount = singleServingsAmount * mealsPerDay;
    }
    let ratioText = '-';
    if (unit === 'g' && totalWeightPerDay > 0 && totalAmount > 0) {
      ratioText = `${((totalAmount / totalWeightPerDay) * 100).toFixed(1)}%`;
    }
    let amountText = '-';
    if (totalAmount > 0) {
      const unitText = unit ? ` ${unit}` : '';
      amountText = `${formatNumber(totalAmount, 2)}${unitText}`;
    }
    details.push({
      index: idx + 1,
      category,
      ingredientName,
      brand,
      ratioText,
      amountText,
      nutritionValue: mainFunction || '-'
    });
  });
  return details;
}

function resetQuoteOverrides() {
  quoteOverrides = { servingWeight: null, shippingType: 'remote' };
}

resetQuoteOverrides();

function calculateQuoteCostForDays(recipe, customer, baseData, days, overrides = {}) {
  const { ratio, mealsPerDay, servingWeight } = baseData;
  const cookingLoss = recipe && recipe.cookingLoss != null ? recipe.cookingLoss : 7;
  const totalServings = mealsPerDay * days;
  const overrideServing = overrides.servingWeight != null && overrides.servingWeight > 0 ? overrides.servingWeight : null;
  const servingWeightPerMeal = overrideServing != null ? overrideServing : servingWeight;
  const baseServingWeight = servingWeight > 0 ? servingWeight : 1;
  const weightScale = servingWeightPerMeal > 0 ? (servingWeightPerMeal / baseServingWeight) : 1;
  const totalWeight = servingWeightPerMeal * totalServings;
  let totalIngredientCost = 0;
  const ingredientsList = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  ingredientsList.forEach(item => {
    const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return;
    const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
    if (!(pricePer500 > 0)) return;
    let totalAmount = 0;
    if (ratio > 0 && mealsPerDay > 0) {
      const singleServingsAmount = item.weight * ratio / mealsPerDay;
      totalAmount = singleServingsAmount * totalServings * weightScale;
    }
    const totalAmountWithLoss = totalAmount * (1 + (cookingLoss || 0) / 100);
    const cost = parseFloat(((totalAmountWithLoss * pricePer500) / 500).toFixed(2));
    totalIngredientCost += cost;
  });

  const packagingList = generatePackagingList(servingWeightPerMeal, totalWeight, totalServings) || [];
  const packagingTotalCost = packagingList.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
  const packagingTotalWeight = packagingList.reduce((sum, item) => sum + (parseFloat(item.totalWeight) || 0), 0);
  const laborCost = totalWeight > 0 ? Math.ceil(totalWeight / 4000) * 20 : 0;
  const packageTotalWeight = totalWeight * (1 + (cookingLoss || 0) / 100) + packagingTotalWeight;
  const overrideShipping = overrides.shippingType || 'remote';
  let shippingCost = 0;
  if (totalWeight > 0) {
    if (overrideShipping === 'local') {
      shippingCost = 20;
    } else if (overrideShipping === 'none') {
      shippingCost = 0;
    } else {
      shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
    }
  }
  const subtotal = totalIngredientCost + packagingTotalCost + laborCost + shippingCost;
  const totalPrice = subtotal > 0 ? Math.round(subtotal * 2) : 0;
  const averagePerServing = (totalServings > 0 && totalPrice > 0) ? (totalPrice / totalServings) : 0;
  return {
    days,
    servingWeight: servingWeightPerMeal,
    totalWeight,
    totalPrice,
    averagePerServing,
    totalServings
  };
}

function renderQuoteResultWithOverrides(options = {}) {
  if (!currentQuoteRenderState) return;
  const { customer, items } = currentQuoteRenderState;
  const overrides = quoteOverrides || { servingWeight: null, shippingType: 'remote' };
  const defaultServingWeight = items.length > 0 ? items[0].baseData.servingWeight : 0;
  const results = items.map(item => {
    const costComparison = QUOTE_DAYS_OPTIONS.map(days => calculateQuoteCostForDays(item.recipe, customer, item.baseData, days, overrides));
    return {
      recipe: item.recipe,
      basicRows: item.basicRows,
      nutritionRows: item.nutritionRows,
      ingredientDetails: item.ingredientDetails,
      costComparison
    };
  });
  renderQuoteResult(customer, results, { overrides, defaultServingWeight, disableAutoScroll: !!options.silent });
  bindQuoteOverrideControls({ defaultServingWeight });
  if (options.focusTarget === 'weight') {
    const input = $('quote-override-serving-weight');
    if (input) {
      input.focus();
    }
  } else if (options.focusTarget === 'shipping') {
    const selectEl = $('quote-override-shipping-type');
    if (selectEl) {
      selectEl.focus();
    }
  }
}

function generateQuoteComparison() {
  if (!currentQuoteCustomerId) {
    alert('请先从顾客列表中选择需要对比的宠物');
    return;
  }
  const customer = store.customers.find(c => c.id === currentQuoteCustomerId);
  if (!customer) {
    alert('未找到顾客信息，请刷新后重试');
    return;
  }
  const recipeIds = Array.from(currentQuoteSelectedRecipeIds);
  if (recipeIds.length === 0) {
    alert('请至少选择一个食谱进行对比');
    return;
  }

  const items = [];
  recipeIds.forEach(id => {
    const recipe = store.recipes.find(r => r.id === id);
    if (!recipe) return;
    const baseData = calculateQuoteBaseData(recipe, customer);
    const basicRows = [
      { label: '适用生命阶段', value: zh(recipe.lifeStage, lifeMap) },
      { label: '营养参考标准', value: nutritionLabelMap[recipe.nutritionStandard] || (recipe.nutritionStandard || '-') },
      { label: '食谱类型', value: recipeTypeLabelMap[recipe.recipeType] || '-' },
      { label: '食谱制作软件', value: recipe.software || '-' }
    ];
    const nutritionRows = [
      { label: '蛋白质（干物质占比）', value: recipe.protein != null ? formatPercentInteger(recipe.protein) : '-' },
      { label: '脂肪（干物质占比）', value: recipe.fat != null ? formatPercentInteger(recipe.fat) : '-' },
      { label: '碳水化合物（干物质占比）', value: recipe.carb != null ? formatPercentInteger(recipe.carb) : '-' },
      { label: '膳食纤维（干物质占比）', value: recipe.fiber != null ? formatPercentInteger(recipe.fiber) : '-' },
      { label: '灰分（干物质占比）', value: recipe.ash != null ? formatPercentInteger(recipe.ash) : '-' },
      { label: '水分', value: recipe.moisture != null ? formatPercentInteger(recipe.moisture) : '-' },
      { label: '钙磷比', value: (recipe.caRatio || recipe.caPratio) || '-' },
      { label: '热量密度', value: recipe.kcalDensity != null ? `${Math.round(recipe.kcalDensity)} kcal/kg` : '-' }
    ];
    items.push({
      recipe,
      basicRows,
      nutritionRows,
      baseData,
      ingredientDetails: baseData.ingredientDetails,
    });
  });

  if (items.length === 0) {
    alert('所选食谱数据不足，无法生成对比单');
    return;
  }

  resetQuoteOverrides();
  currentQuoteRenderState = { customer, items };
  renderQuoteResultWithOverrides();
  closeQuoteRecipeSelector();
}

function buildQuoteIngredientsTable(details) {
  if (!details || details.length === 0) return '<div class="detail-empty">未配置原料</div>';
  const rowsHtml = details.map(item => `
    <tr>
      <td>${item.index}</td>
      <td>${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.ingredientName)}</td>
      <td>${escapeHtml(item.brand || '-')}</td>
      <td>${getRatioUsageText(item)}</td>
      <td>${escapeHtml(item.nutritionValue || '-')}</td>
    </tr>
  `).join('');
  return `
    <table class="detail-table quote-ingredients-table">
      <thead>
        <tr>
          <th style="width:50px;">序号</th>
          <th style="width:130px;">类别</th>
          <th style="width:220px;">食谱原材料</th>
          <th style="width:180px;">品牌/来源</th>
          <th style="width:150px;">重量占比/用量</th>
          <th>本食谱中的主要营养价值</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

function getRatioUsageText(item) {
  const ratio = item.ratioText && item.ratioText !== '-' ? item.ratioText : '';
  if (ratio) return escapeHtml(ratio);
  return '待份量确定后可算出';
}

function buildQuoteOverrideControls(options = {}) {
  const overrides = options.overrides || quoteOverrides || { servingWeight: null, shippingType: 'remote' };
  const defaultServingWeight = options.defaultServingWeight || 0;
  const shippingValue = overrides.shippingType || 'remote';
  const weightValue = overrides.servingWeight != null ? overrides.servingWeight : '';
  const placeholder = defaultServingWeight > 0 ? `默认约 ${Math.round(defaultServingWeight)} g/份` : '';
  const shippingOptions = QUOTE_SHIPPING_OPTIONS.map(opt => `<option value="${opt.value}" ${opt.value === shippingValue ? 'selected' : ''}>${opt.label}</option>`).join('');
  return `
    <div class="quote-override-card">
      <div class="quote-override-header">临时调整（仅对本次询价单生效）：</div>
      <div class="quote-override-fields">
        <label class="quote-override-field">
          <span>每份重量（g）</span>
          <input type="number" id="quote-override-serving-weight" min="1" step="1" placeholder="${placeholder}" value="${weightValue}" />
        </label>
        <label class="quote-override-field">
          <span>快递类型</span>
          <select id="quote-override-shipping-type">
            ${shippingOptions}
          </select>
        </label>
        <div class="quote-override-actions">
          <button type="button" class="btn small" id="quote-override-reset">恢复默认</button>
        </div>
      </div>
      <div class="quote-override-hint">调整后将自动刷新费用对比，不会写入原始订单数据。</div>
    </div>
  `;
}

function buildQuoteCostTable(costComparison) {
  if (!costComparison || costComparison.length === 0) return '<div class="detail-empty">暂无费用数据</div>';
  const rowsHtml = costComparison.map(item => {
    const servingText = item.servingWeight > 0 ? `${Math.round(item.servingWeight)} g` : '-';
    const totalWeightText = item.totalWeight > 0 ? `${Math.round(item.totalWeight)} g` : '-';
    const totalPriceText = item.totalPrice > 0 ? formatCurrency(item.totalPrice, 0) : '-';
    const avgText = (item.totalServings > 0 && item.averagePerServing > 0) ? `${formatCurrency(item.averagePerServing, 1)}/份` : '-';
    return `<tr>
      <td>${item.days} 天</td>
      <td>${servingText}</td>
      <td>${item.totalServings > 0 ? item.totalServings : '-'}</td>
      <td>${totalWeightText}</td>
      <td class="quote-cost-total">${totalPriceText}</td>
      <td>${avgText}</td>
    </tr>`;
  }).join('');
  const tableHtml = `
    <table class="quote-cost-table">
      <thead>
        <tr>
          <th>制作天数</th>
          <th>每份重量</th>
          <th>总份数</th>
          <th>总净重</th>
          <th>订单总价</th>
          <th>平均每份费用</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
  const notesHtml = `
    <div class="quote-cost-notes">
      <div>1、制作天数/份数可自选，表中为参考用量；</div>
      <div>2、按小家伙的进餐习惯，每顿饭分装为1份。每份重量根据食谱的热量密度和小家伙的每日能量需求计算得出，需要调整也可以告诉我。</div>
    </div>
  `;
  return `<div class="quote-cost-wrapper">${tableHtml}${notesHtml}</div>`;
}

function renderQuoteResult(customer, results, options = {}) {
  const contentEl = $('quote-result-content');
  const resultCard = $('quote-result-card');
  if (!contentEl || !resultCard) return;
  const summaryHtml = buildQuoteCustomerSummary(customer);
  const overrideControlsHtml = (results && results.length > 0) ? buildQuoteOverrideControls({
    overrides: options.overrides,
    defaultServingWeight: options.defaultServingWeight
  }) : '';
  const recipeHtml = results.map(item => {
    const ingredientTable = buildQuoteIngredientsTable(item.ingredientDetails);
    const costTable = buildQuoteCostTable(item.costComparison);
    const headerHtml = `
      <div class="quote-recipe-header">
        <h4 class="quote-recipe-title">${escapeHtml(item.recipe.name || '-')}</h4>
        <div class="quote-recipe-subtitle">编号：${escapeHtml(item.recipe.code || '-')}</div>
      </div>
    `;
    return `
      <div class="quote-block">
        ${headerHtml}
        ${buildDetailGrid(item.basicRows, { columns: 4, compact: true })}
        <div class="detail-section-title">原料组成</div>
        ${ingredientTable}
        <div class="detail-section-title">营养数据</div>
        ${buildDetailGrid(item.nutritionRows, { columns: 4, compact: true })}
        <div class="detail-section-title">费用对比</div>
        ${costTable}
      </div>
    `;
  }).join('');
  contentEl.innerHTML = `${summaryHtml}${overrideControlsHtml}${recipeHtml}`;
  resultCard.style.display = 'block';
  if (options.disableAutoScroll !== true) {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function bindQuoteOverrideControls(options = {}) {
  const overrides = quoteOverrides || { servingWeight: null, shippingType: 'remote' };
  const defaultServingWeight = options.defaultServingWeight || 0;
  const weightInput = $('quote-override-serving-weight');
  if (weightInput) {
    weightInput.value = overrides.servingWeight != null ? overrides.servingWeight : '';
    if (defaultServingWeight > 0) {
      weightInput.placeholder = `默认约 ${Math.round(defaultServingWeight)} g/份`;
    }
    weightInput.addEventListener('change', () => {
      const value = parseFloat(weightInput.value);
      if (Number.isFinite(value) && value > 0) {
        quoteOverrides.servingWeight = value;
      } else {
        quoteOverrides.servingWeight = null;
        weightInput.value = '';
      }
      renderQuoteResultWithOverrides({ silent: true, focusTarget: 'weight' });
    });
  }

  const shippingSelect = $('quote-override-shipping-type');
  if (shippingSelect) {
    shippingSelect.value = overrides.shippingType || 'remote';
    shippingSelect.addEventListener('change', () => {
      quoteOverrides.shippingType = shippingSelect.value || 'remote';
      renderQuoteResultWithOverrides({ silent: true, focusTarget: 'shipping' });
    });
  }

  const resetBtn = $('quote-override-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', (event) => {
      event.preventDefault();
      resetQuoteOverrides();
      renderQuoteResultWithOverrides({ silent: true, focusTarget: 'weight' });
    });
  }
}

function triggerDownload(dataUrl, fileName) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function exportQuoteImage() {
  const exportBtn = $('btn-export-quote-image');
  const resultCard = $('quote-result-card');
  const resultContent = $('quote-result-content');
  if (!resultCard || resultCard.style.display === 'none' || !resultContent || !resultContent.innerHTML.trim()) {
    alert('请先生成食谱对比单');
    return;
  }
  if (!window.htmlToImage || typeof window.htmlToImage.toPng !== 'function') {
    alert('当前环境暂不支持生成图片，请升级浏览器后重试');
    return;
  }
  let scrollY = window.scrollY || 0;
  try {
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.dataset.loading = 'true';
      exportBtn.textContent = '生成中...';
    }
    resultCard.classList.add('quote-export-mode');
    window.scrollTo({ top: resultCard.offsetTop, behavior: 'instant' });

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const pixelRatio = Math.min(3, (window.devicePixelRatio || 1) * 1.6);
    const dataUrl = await window.htmlToImage.toPng(resultCard, {
      pixelRatio,
      cacheBust: true,
      backgroundColor: '#ffffff'
    });
    const fileName = `quote-${formatFileTimestamp()}.png`;
    triggerDownload(dataUrl, fileName);
  } catch (error) {
    console.error('生成图片失败:', error);
    alert('生成图片失败，请重试');
  } finally {
    resultCard.classList.remove('quote-export-mode');
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.dataset.loading = 'false';
      exportBtn.textContent = '生成图片';
    }
  }
}

function closeQuoteResult() {
  const resultCard = $('quote-result-card');
  const contentEl = $('quote-result-content');
  if (resultCard) resultCard.style.display = 'none';
  if (contentEl) contentEl.innerHTML = '';
}

async function formatDetails(c) {
  // 构建紧凑的表格单元格
  const buildCell = (label, value) => {
    return `<td style="padding:4px 6px; border:1px solid var(--border); background:var(--bg-tertiary); font-weight:500; font-size:12px; width:100px; white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:4px 6px; border:1px solid var(--border); font-size:12px;">${value}</td>`;
  };
  
  let html = '<div class="item-details"><table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">';
  
  // 如果有主人信息，先显示主人信息
  if (c.userId) {
    html += '<tr><td colspan="4" style="padding:6px; background:var(--bg-secondary); font-weight:600; text-align:center; font-size:13px;">主人信息</td></tr>';
    
    // 主人信息使用两列布局
    html += '<tr>';
    html += buildCell('主人昵称', escapeHtml(c.userName || '-'));
    
    // 微信号/手机号
    const contactInfo = c.wechat || c.phone || '-';
    html += buildCell('微信号/手机号', escapeHtml(contactInfo));
    html += '</tr>';
    
    // 收货地址（如果有userId，异步加载）
    html += '<tr>';
    if (backendState.token && c.userId) {
      try {
        const addresses = await backendRequest(`/api/v1/addresses/customer/${c.userId}`, {
          method: 'GET'
        });
        const addressList = Array.isArray(addresses) ? addresses : (addresses.items || []);
        if (addressList && addressList.length > 0) {
          // 按默认地址优先排序
          const sortedAddressList = [...addressList].sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return 0;
          });
          
          const addressHtml = sortedAddressList.map(addr => {
            const parts = [];
            if (addr.contactName) parts.push(addr.contactName);
            if (addr.contactPhone) parts.push(addr.contactPhone);
            if (addr.region) parts.push(addr.region);
            if (addr.detail) parts.push(addr.detail);
            const addrStr = parts.join(' ');
            const isDefault = addr.isDefault ? ' <span style="color:var(--primary); font-size:11px; font-weight:600;">(默认)</span>' : '';
            return `<div style="margin-bottom:4px; line-height:1.5;">${escapeHtml(addrStr)}${isDefault}</div>`;
          }).join('');
          html += `<td style="padding:4px 6px; border:1px solid var(--border); background:var(--bg-tertiary); font-weight:500; font-size:12px; width:100px; vertical-align:top;">收货地址</td>
            <td colspan="3" style="padding:4px 6px; border:1px solid var(--border); font-size:12px; vertical-align:top;">${addressHtml}</td>`;
        } else {
          html += buildCell('收货地址', escapeHtml(c.address || '-'));
          html += '<td colspan="2"></td>';
        }
      } catch (error) {
        console.warn('加载地址失败:', error);
        html += buildCell('收货地址', escapeHtml(c.address || '-'));
        html += '<td colspan="2"></td>';
      }
    } else {
      html += buildCell('收货地址', escapeHtml(c.address || '-'));
      html += '<td colspan="2"></td>';
    }
    html += '</tr>';
    
    html += '<tr><td colspan="4" style="padding:2px;"></td></tr>'; // 空行分隔
  }
  
  // 宠物信息
  html += '<tr><td colspan="4" style="padding:6px; background:var(--bg-secondary); font-weight:600; text-align:center; font-size:13px;">宠物信息</td></tr>';
  
  const years = calcAgeYears(c.birthday);
  const showAge = c.lifeStage === 'adult' || c.lifeStage === 'pregnancy' || c.lifeStage === 'lactation';
  const showPuppy = c.lifeStage === 'puppy';
  const showLact = c.lifeStage === 'lactation';
  
  // 基本信息 - 两列布局
  html += '<tr>';
  html += buildCell('宠物昵称', escapeHtml(c.petName || '-'));
  html += buildCell('品种', escapeHtml(c.breed || '-'));
  html += '</tr>';
  
  html += '<tr>';
  html += buildCell('年龄', formatAgeDisplay(c));
  html += buildCell('生日', escapeHtml(c.birthday || '-'));
  html += '</tr>';
  
  html += '<tr>';
  html += buildCell('体重', c.weightKg != null ? `${formatNumber(c.weightKg, 2)} kg` : '-');
  html += buildCell('性别', zh(c.sex, sexMap));
  html += '</tr>';
  
  html += '<tr>';
  html += buildCell('是否绝育', zh(c.neutered, neuterMap));
  html += buildCell('生命阶段', zh(c.lifeStage, lifeMap));
  html += '</tr>';
  
  // 活动水平用中文显示，热量系数只保留整数
  const activityText = c.activity ? zh(c.activity, actMap) : '-';
  const kcalFactor = c.kcalFactor != null ? Math.round(c.kcalFactor) : (c.activity ? activityKcalFactor(c.activity) : '-');
  html += '<tr>';
  html += `<td style="padding:4px 6px; border:1px solid var(--border); background:var(--bg-tertiary); font-weight:500; font-size:12px; width:100px;">活动水平</td>
    <td colspan="3" style="padding:4px 6px; border:1px solid var(--border); font-size:12px;">${activityText !== '-' ? `${activityText}（热量系数 ${kcalFactor}）` : '-'}</td>`;
  html += '</tr>';
  
  if (showPuppy) {
    html += '<tr>';
    if (c.monthAge != null) html += buildCell('月龄', c.monthAge);
    if (c.monthFactor != null) html += buildCell('月龄系数', c.monthFactor);
    if (c.monthAge == null && c.monthFactor == null) html += '<td colspan="4"></td>';
    html += '</tr>';
  }
  if (showLact) {
    html += '<tr>';
    html += buildCell('哺乳阶段', zh(c.lactStage, lactMap));
    html += buildCell('产仔数', c.litterCount != null ? c.litterCount : '-');
    html += '</tr>';
    if (c.lactFactor != null) {
      html += '<tr>';
      html += buildCell('哺乳阶段因子', c.lactFactor);
      html += '<td colspan="2"></td>';
      html += '</tr>';
    }
  }
  
  html += '<tr>';
  if (c.estKcal != null) html += buildCell('每日能量估算', `${c.estKcal} kcal/日`);
  if (c.bcs != null) html += buildCell('体况评分', c.bcs);
  if (c.estKcal == null && c.bcs == null) html += '<td colspan="4"></td>';
  html += '</tr>';
  
  if (c.mealsPerDay != null) {
    html += '<tr>';
    html += buildCell('每日吃几顿饭', c.mealsPerDay);
    html += '<td colspan="2"></td>';
    html += '</tr>';
  }
  
  // 备注类信息 - 占用整行
  if (c.allergies) {
    html += '<tr>';
    html += `<td style="padding:4px 6px; border:1px solid var(--border); background:var(--bg-tertiary); font-weight:500; font-size:12px; width:100px; vertical-align:top;">过敏/不耐受</td>
      <td colspan="3" style="padding:4px 6px; border:1px solid var(--border); font-size:12px; vertical-align:top;">${escapeHtml(c.allergies)}</td>`;
    html += '</tr>';
  }
  if (c.avoid) {
    html += '<tr>';
    html += `<td style="padding:4px 6px; border:1px solid var(--border); background:var(--bg-tertiary); font-weight:500; font-size:12px; width:100px; vertical-align:top;">挑食/尽量不吃</td>
      <td colspan="3" style="padding:4px 6px; border:1px solid var(--border); font-size:12px; vertical-align:top;">${escapeHtml(c.avoid)}</td>`;
    html += '</tr>';
  }
  if (c.med) {
    html += '<tr>';
    html += `<td style="padding:4px 6px; border:1px solid var(--border); background:var(--bg-tertiary); font-weight:500; font-size:12px; width:100px; vertical-align:top;">症状史/疾病史</td>
      <td colspan="3" style="padding:4px 6px; border:1px solid var(--border); font-size:12px; vertical-align:top;">${escapeHtml(c.med)}</td>`;
    html += '</tr>';
  }
  if (c.notes) {
    html += '<tr>';
    html += `<td style="padding:4px 6px; border:1px solid var(--border); background:var(--bg-tertiary); font-weight:500; font-size:12px; width:100px; vertical-align:top;">备注</td>
      <td colspan="3" style="padding:4px 6px; border:1px solid var(--border); font-size:12px; vertical-align:top;">${escapeHtml(c.notes)}</td>`;
    html += '</tr>';
  }
  
  html += '</table></div>';
  return html;
}

function paginatedCustomers() {
  // 如果使用后端数据，直接返回当前页数据（后端已处理分页和搜索）
  if (backendState.token && store.totalCustomers !== undefined) {
    return {
      pageItems: store.customers,
      total: store.totalCustomers || store.customers.length,
      totalPages: store.totalPages || 1
    };
  }
  
  // 本地数据：客户端分页和搜索
  const q = ($('customer-search').value || '').trim().toLowerCase();
  const filtered = store.customers.filter(c => {
    const text = `${c.wechat || ''} ${c.petName || ''} ${c.address || ''}`.toLowerCase();
    return !q || text.includes(q);
  });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / store.pageSize));
  if (store.page > totalPages) store.page = totalPages;
  const start = (store.page - 1) * store.pageSize;
  const pageItems = filtered.slice(start, start + store.pageSize);
  return { pageItems, total, totalPages };
}

function renderCustomersList() {
  const list = $('customers-list');
  const { pageItems, total, totalPages } = paginatedCustomers();
  if (pageItems.length === 0) {
    list.innerHTML = '<div class="muted">暂无记录</div>';
  } else {
    list.innerHTML = pageItems.map((c, i) => {
      const ownerName = c.userName || '-';
      const contactInfo = c.wechat || c.phone || '-';
      return `
        <div class="list-item" data-id="${c.id}">
          <div class="list-item-row">
            <div>${escapeHtml(c.petName || '-')}</div>
            <div>${escapeHtml(c.breed || '-')}</div>
            <div>${formatAgeDisplay(c)}</div>
            <div>${c.weightKg != null ? `${formatNumber(c.weightKg, 2)} kg` : '-'}</div>
            <div>${escapeHtml(ownerName)}</div>
            <div>${escapeHtml(contactInfo)}</div>
          </div>
          <div class="item-actions">
            <button class="btn small" data-quote="${c.id}">筛选食谱</button>
            <button class="btn small" data-detail="${c.id}">详细信息</button>
            <button class="btn small" data-edit="${c.id}">编辑</button>
            <button class="btn small" data-del="${c.id}">删除</button>
          </div>
        </div>`;
    }).join('');
  }
  list.querySelectorAll('[data-detail]').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.detail;
    const wrap = list.querySelector(`.list-item[data-id="${id}"]`);
    const existing = wrap.querySelector('.item-details');
    if (existing) { existing.remove(); return; }
    const c = store.customers.find(x => x.id === id);
    if (!c) return;
    // 显示加载中
    wrap.insertAdjacentHTML('beforeend', '<div class="item-details">加载中...</div>');
    try {
      const detailsHtml = await formatDetails(c);
      const loadingEl = wrap.querySelector('.item-details');
      if (loadingEl) {
        loadingEl.outerHTML = detailsHtml;
      }
    } catch (error) {
      console.error('加载详细信息失败:', error);
      const loadingEl = wrap.querySelector('.item-details');
      if (loadingEl) {
        loadingEl.innerHTML = '<div style="color:red;">加载详细信息失败: ' + escapeHtml(error.message || '未知错误') + '</div>';
      }
    }
  }));
  list.querySelectorAll('[data-quote]').forEach(btn => btn.addEventListener('click', () => openQuoteRecipeSelector(btn.dataset.quote)));
  list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
    openCustomerForm(btn.dataset.edit);
    const formCard = $('customer-form-card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  list.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => deleteCustomer(btn.dataset.del)));

  const totalEl = $('customers-total'); if (totalEl) totalEl.textContent = `共 ${total} 条`;
  const infoEl = $('customers-pageinfo'); if (infoEl) infoEl.textContent = `第 ${store.page}/${totalPages} 页`;
  const prevBtn = $('customers-prev'); 
  if (prevBtn) {
    prevBtn.disabled = store.page <= 1;
    prevBtn.onclick = () => { 
      if (store.page > 1) { 
        store.page -= 1;
        if (backendState.token) {
          loadCustomersFromBackend();
        } else {
          renderCustomersList();
        }
      } 
    };
  }
  const nextBtn = $('customers-next'); 
  if (nextBtn) {
    nextBtn.disabled = store.page >= totalPages;
    nextBtn.onclick = () => { 
      if (store.page < totalPages) { 
        store.page += 1;
        if (backendState.token) {
          loadCustomersFromBackend();
        } else {
          renderCustomersList();
        }
      } 
    };
  }
}
async function openCustomerForm(id) {
  const card = $('customer-form-card');
  const title = $('customer-form-title');
  if (!card) return;
  card.style.display = 'block';
  if (id) {
    const c = store.customers.find(x => x.id === id);
    if (!c) {
      console.error('未找到顾客数据，ID:', id);
      return;
    }
    console.log('打开编辑表单 - 顾客数据:', {
      id: c.id,
      petName: c.petName,
      birthday: c.birthday,
      address: c.address,
      userName: c.userName
    });
    title.textContent = '编辑顾客';
    $('customer-id').value = c.id;
    
    // 显示主人昵称
    if ($('c-userName')) {
      $('c-userName').value = c.userName || '';
    }
    
    $('c-userName').value = c.userName || '';
    $('c-wechat').value = c.wechat || '';
    
    // 加载所有地址
    let allAddresses = c.address || '';
    console.log('加载地址信息 - customer.address:', c.address, 'allAddresses:', allAddresses);
    const addressEl = $('c-address');
    if (addressEl) {
      if (allAddresses) {
        addressEl.value = allAddresses;
      } else {
        addressEl.value = '';
        addressEl.placeholder = '（点击"管理地址"查看）';
      }
    } else {
      console.warn('地址输入框不存在');
    }
    
    // 确保地址管理按钮可见（只有在有userId且已登录时才显示）
    const addressManageBtn = $('c-address-manage');
    if (addressManageBtn) {
      if (c.userId && backendState.token) {
        addressManageBtn.style.display = 'inline-block';
        addressManageBtn.textContent = '管理地址';
      } else {
        addressManageBtn.style.display = 'none';
      }
    } else {
      console.warn('地址管理按钮不存在');
    }
    
    $('c-petName').value = c.petName || '';
    // 处理品种选择：如果是"其它品种"，需要检查是否有手动输入的值
    const breedValue = c.breed || '';
    if (breedValue === '其它品种' || (!breedValue && c.breedOther)) {
      $('c-breed').value = '其它品种';
      const otherInput = $('c-breed-other');
      if (otherInput) {
        otherInput.style.display = 'block';
        otherInput.value = c.breedOther || breedValue || '';
      }
    } else {
      $('c-breed').value = breedValue;
      const otherInput = $('c-breed-other');
      if (otherInput) {
        otherInput.style.display = 'none';
        otherInput.value = '';
      }
    }
    
    // 确保生日格式正确（YYYY-MM-DD）
    const birthday = c.birthday || '';
    console.log('加载生日信息 - customer.birthday:', birthday, 'type:', typeof birthday);
    const birthdayEl = $('c-birthday');
    if (birthdayEl) {
      if (birthday && typeof birthday === 'string' && birthday.trim()) {
        // 处理各种可能的日期格式
        let formattedDate = birthday.trim();
        if (formattedDate.includes('T')) {
          formattedDate = formattedDate.split('T')[0];
        } else if (formattedDate.includes(' ')) {
          formattedDate = formattedDate.split(' ')[0];
        }
        // 确保格式为 YYYY-MM-DD
        if (formattedDate && formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          birthdayEl.value = formattedDate;
          console.log('✓ 生日已设置:', formattedDate);
        } else {
          console.warn('生日格式不正确:', birthday, '->', formattedDate);
          birthdayEl.value = '';
        }
      } else {
        console.warn('生日为空或格式不正确:', birthday, 'type:', typeof birthday);
        birthdayEl.value = '';
      }
    } else {
      console.warn('生日输入框不存在');
    }
    $('c-weightKg').value = c.weightKg || '';
    $('c-sex').value = c.sex || 'unknown';
    $('c-neutered').value = c.neutered || 'unknown';
    $('c-lifeStage').value = c.lifeStage || 'adult';
    $('c-activity').value = c.activity || 'sedentary';
    // 运动-能量系数显示为整数
    const kcalFactor = c.kcalFactor != null ? c.kcalFactor : activityKcalFactor($('c-activity').value);
    // 运动-能量系数显示为整数
    const kcalFactorEl = $('c-kcalFactor');
    if (kcalFactorEl) {
      kcalFactorEl.value = kcalFactor != null ? Math.round(Number(kcalFactor)) : '';
    }
    $('c-bcs').value = c.bcs || '';
    $('c-mealsPerDay').value = c.mealsPerDay || '';
    $('c-allergies').value = c.allergies || '';
    $('c-avoid').value = c.avoid || '';
    $('c-med').value = c.med || '';
    $('c-notes').value = c.notes || '';
    if ($('c-monthAge')) $('c-monthAge').value = c.monthAge != null ? c.monthAge : '';
    if ($('c-monthFactor')) $('c-monthFactor').value = c.monthFactor != null ? c.monthFactor : '';
    $('c-lactStage').value = c.lactStage || 'week1';
    $('c-lactFactor').value = c.lactFactor != null ? c.lactFactor : lactFactorFromStage($('c-lactStage').value);
    $('c-litterCount').value = c.litterCount != null ? c.litterCount : '';
    updatePuppyMonthFields();
    updateLactationFields();
  } else {
    title.textContent = '新增顾客';
    $('customer-id').value = '';
    if ($('c-userName')) $('c-userName').value = '';
    ['c-wechat','c-address','c-petName','c-breed','c-birthday','c-weightKg','c-bcs','c-mealsPerDay','c-allergies','c-avoid','c-med','c-notes','c-monthAge','c-monthFactor','c-litterCount'].forEach(id => { const el = $(id); if (el) el.value = ''; });
    // 清空其它品种输入框
    const otherBreedInput = $('c-breed-other');
    if (otherBreedInput) {
      otherBreedInput.style.display = 'none';
      otherBreedInput.value = '';
      otherBreedInput.required = false;
    }
    // 新增顾客时隐藏地址管理按钮（因为没有userId）
    const addressManageBtn = $('c-address-manage');
    if (addressManageBtn) {
      addressManageBtn.style.display = 'none';
    }
    $('c-sex').value = 'unknown';
    $('c-neutered').value = 'unknown';
    $('c-lifeStage').value = 'adult';
    $('c-activity').value = '';
    $('c-kcalFactor').value = '';
    // 清空生命阶段描述
    const descEl = $('life-stage-description');
    if (descEl) descEl.textContent = '';
    $('c-lactStage').value = 'week1';
    $('c-lactFactor').value = lactFactorFromStage('week1');
    updatePuppyMonthFields();
    updateLactationFields();
  }
  computeAndFillEstKcal();
}

window.__openCustomer = () => openCustomerForm();

async function deleteCustomer(id) {
  if (!confirm('确认删除该顾客及其宠物信息？')) return;
  
  // 如果是pet_开头的ID，说明是从后端加载的数据
  if (id && id.startsWith('pet_')) {
    const petId = id.replace('pet_', '');
    try {
      // 调用后端API删除
      await backendRequest(`/api/v1/pets/${petId}`, {
        method: 'DELETE'
      });
      console.log('✓ 后端删除成功');
      
      // 成功后重新加载数据
      if (backendState.token) {
        await loadCustomersFromBackend();
      } else {
        // 如果未登录，回退到本地删除
        store.customers = store.customers.filter(c => c.id !== id);
        saveApp();
        renderCustomersList();
      }
    } catch (error) {
      console.error('删除失败:', error);
      // 提供更友好的错误提示
      const errorMessage = error.message || '未知错误';
      if (errorMessage.includes('订单') || errorMessage.includes('foreign key') || errorMessage.includes('关联')) {
        alert('删除失败：该宠物有关联的订单记录，无法删除。请先处理相关订单后再试。');
      } else {
        alert('删除失败: ' + errorMessage);
      }
    }
  } else {
    // 本地数据，直接删除
    store.customers = store.customers.filter(c => c.id !== id);
    saveApp();
    renderCustomersList();
  }
}

// 从后端加载食谱数据
async function loadRecipesFromBackend() {
  if (!backendState.token) {
    console.warn('未登录，无法加载食谱数据');
    store.recipes = [];
    store.totalRecipes = 0;
    store.recipeTotalPages = 1;
    renderRecipesList();
    return;
  }
  
  try {
    const search = $('recipe-search')?.value || '';
    const lifeStage = $('recipe-lifeStage-filter')?.value || '';
    const customFilter = $('recipe-custom-filter')?.value || '';
    let recipeType = undefined;
    
    // 将customFilter转换为recipeType
    if (customFilter === 'true') {
      recipeType = 'custom';
    } else if (customFilter === 'false') {
      recipeType = 'standard';
    }
    
    const params = new URLSearchParams({
      page: store.recipePage || 1,
      pageSize: store.recipePageSize || 10
    });
    
    if (search && search.trim()) params.append('search', search.trim());
    if (lifeStage && lifeStage.trim()) params.append('lifeStage', lifeStage.trim());
    if (recipeType) params.append('recipeType', recipeType);
    
    const data = await backendRequest(`/api/v1/recipes?${params.toString()}`);
    console.log('[loadRecipesFromBackend] 后端返回的原始数据:', data);
    console.log('[loadRecipesFromBackend] data.items 长度:', data.items?.length);
    if (data.items && data.items.length > 0) {
      const firstRecipe = data.items[0];
      console.log('[loadRecipesFromBackend] 第一个食谱的完整数据:', JSON.stringify(firstRecipe, null, 2));
      console.log('[loadRecipesFromBackend] 第一个食谱的 keys:', Object.keys(firstRecipe));
      console.log('[loadRecipesFromBackend] ingredients 存在:', 'ingredients' in firstRecipe);
      console.log('[loadRecipesFromBackend] ingredients 值:', firstRecipe.ingredients);
      console.log('[loadRecipesFromBackend] ingredients 类型:', typeof firstRecipe.ingredients);
      console.log('[loadRecipesFromBackend] ingredients 是否为数组:', Array.isArray(firstRecipe.ingredients));
      
      // 如果 ingredients 不存在，尝试从其他可能的字段获取
      if (!('ingredients' in firstRecipe) || firstRecipe.ingredients === undefined) {
        console.error('[loadRecipesFromBackend] 警告：第一个食谱缺少 ingredients 字段！');
        console.error('[loadRecipesFromBackend] 第一个食谱的所有字段:', Object.keys(firstRecipe));
        // 确保 ingredients 字段存在
        firstRecipe.ingredients = [];
      }
    }
    
    // 转换数据格式（将后端返回的数据转换为前端格式）
    const recipes = (data.items || []).map(recipe => {
      console.log('[loadRecipesFromBackend] 处理食谱:', recipe.name);
      console.log('[loadRecipesFromBackend] recipe.ingredients 原始值:', recipe.ingredients);
      console.log('[loadRecipesFromBackend] recipe.ingredients 类型:', typeof recipe.ingredients);
      console.log('[loadRecipesFromBackend] recipe.ingredients 是否为数组:', Array.isArray(recipe.ingredients));
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        console.log('[loadRecipesFromBackend] 第一个食材项:', recipe.ingredients[0]);
      }
      
      // 确保 ingredients 始终是数组
      let ingredients = [];
      if (recipe.ingredients) {
        if (Array.isArray(recipe.ingredients)) {
          ingredients = recipe.ingredients;
        } else {
          console.warn('[loadRecipesFromBackend] recipe.ingredients 不是数组:', typeof recipe.ingredients, recipe.ingredients);
          ingredients = [];
        }
      } else {
        console.warn('[loadRecipesFromBackend] recipe.ingredients 为 undefined 或 null，使用空数组');
        ingredients = [];
      }
      
      return {
        id: `recipe_${recipe.id}`, // 使用recipe_前缀避免ID冲突
        code: recipe.code || '',
        name: recipe.name || '',
        description: recipe.description || '',
        lifeStage: recipe.lifeStage || null,
        recipeType: recipe.recipeType || 'standard',
        software: recipe.software || 'ADF',
        nutritionStandard: recipe.nutritionStandard || 'FEDIAF',
        cookingLoss: recipe.cookingLoss !== undefined ? recipe.cookingLoss : 7,
        protein: recipe.protein || null,
        fat: recipe.fat || null,
        carb: recipe.carb || null,
        fiber: recipe.fiber || null,
        ash: recipe.ash || null,
        moisture: recipe.moisture || null,
        caRatio: recipe.caRatio || recipe.caPratio || null, // 兼容旧字段名
        totalKcal: recipe.totalKcal || null,
        totalWeight: recipe.totalWeight || null,
        kcalDensity: recipe.kcalDensity || null,
        ingredients: ingredients.map((ing, idx) => {
          console.log(`[loadRecipesFromBackend] 处理食材项 ${idx}:`, ing);
          if (!ing || typeof ing !== 'object') {
            console.warn('[loadRecipesFromBackend] 发现无效的食材项:', ing);
            return null;
          }
          const result = {
            ingredientName: (ing.ingredientName != null && ing.ingredientName !== '') ? String(ing.ingredientName).trim() : '', // 确保是字符串且不为空
            weight: ing.weight != null ? ing.weight : 0,
            unit: (ing.unit && ing.unit.trim()) ? ing.unit.trim() : 'g'
          };
          console.log(`[loadRecipesFromBackend] 处理后的食材项 ${idx}:`, result);
          return result;
        }).filter(ing => {
          const isValid = ing && ing.ingredientName;
          if (!isValid) {
            console.warn('[loadRecipesFromBackend] 过滤掉无效食材项:', ing);
          }
          return isValid;
        }), // 过滤掉没有名称的项
        cookingSteps: (recipe.cookingSteps || []).map(step => ({
          stepOrder: step.stepOrder,
          description: step.description
        })),
        createdAt: recipe.createdAt ? new Date(recipe.createdAt).getTime() : Date.now(),
        updatedAt: recipe.updatedAt ? new Date(recipe.updatedAt).getTime() : Date.now(),
        // 保存后端ID用于更新和删除
        _backendId: recipe.id
      };
    });
    
    // 更新store
    store.recipes = recipes;
    store.totalRecipes = data.total || 0;
    store.recipeTotalPages = data.totalPages || 1;
    
    console.log(`✓ 从后端加载了 ${recipes.length} 条食谱记录（共 ${data.total} 条）`);
    
    renderRecipesList();
  } catch (error) {
    console.error('加载食谱列表失败:', error);
    // 如果是401错误，不显示alert，只显示空列表
    if (error.message && error.message.includes('401')) {
      console.warn('未登录或token过期，请重新登录');
      store.recipes = [];
      store.totalRecipes = 0;
      store.recipeTotalPages = 1;
      renderRecipesList();
    } else {
      // 其他错误才显示alert
      alert('加载食谱列表失败: ' + (error.message || '未知错误'));
      store.recipes = [];
      store.totalRecipes = 0;
      store.recipeTotalPages = 1;
      renderRecipesList();
    }
  }
}

// 从后端加载原料数据
async function loadIngredientsFromBackend() {
  if (!backendState.token) {
    console.warn('未登录，无法加载原料数据');
    store.ingredients = [];
    store.totalIngredients = 0;
    store.ingredientTotalPages = 1;
    renderIngredientsList();
    return;
  }
  
  try {
    const search = $('ingredient-search')?.value || '';
    const category = $('ingredient-category-filter')?.value || '';
    const subject = $('ingredient-subject-filter')?.value || '';
    const part = $('ingredient-part-filter')?.value || '';
    const originType = $('ingredient-origin-type-filter')?.value || '';
    const classification = ''; // 预留，暂时不使用
    
    const requestedPage = store.ingredientPage || 1;
    console.log(`[loadIngredientsFromBackend] 请求页码: ${requestedPage}`);
    const params = new URLSearchParams({
      page: requestedPage,
      pageSize: store.ingredientPageSize || 10
    });
    
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (subject) params.append('subject', subject);
    if (part) params.append('part', part);
    if (originType) params.append('originType', originType);
    if (classification) params.append('classification', classification);
    
    const data = await backendRequest(`/api/v1/ingredients?${params.toString()}`);
    
    // 转换数据格式（将后端返回的数据转换为前端格式）
    const ingredients = (data.items || []).map(ing => {
      // 确保source字段被正确读取（可能是null、undefined或空字符串）
      // 如果后端没有返回source字段，使用空字符串作为默认值
      const sourceValue = (ing.source !== null && ing.source !== undefined && ing.source !== '') 
        ? String(ing.source).trim() 
        : '';
      
      // 调试日志：检查source字段（只在有品牌但没有source时记录，或者如果source存在时也记录一次）
      if (ing.id) {
        if (!sourceValue && ing.brand) {
          console.log('[loadIngredientsFromBackend] Ingredient', ing.id, 'has no source, raw data:', {
            id: ing.id,
            name: ing.name,
            brand: ing.brand,
            source: ing.source,
            sourceType: typeof ing.source,
            hasSourceKey: 'source' in ing,
            allKeys: Object.keys(ing)
          });
        } else if (sourceValue) {
          console.log('[loadIngredientsFromBackend] Ingredient', ing.id, 'has source:', sourceValue);
        }
      }
      
      return {
        id: `ing_${ing.id}`, // 使用ing_前缀避免ID冲突
        code: ing.code || '',
        category: ing.category || '',
        name: ing.name || '',
        brand: ing.brand || '',
        source: sourceValue, // 采购渠道
        cost: ing.cost || null,
        quantity: ing.quantity || null,
        unit: ing.unit || 'g',
        pricePer500: ing.pricePer500 || null,
        ediblePortion: ing.ediblePortion !== undefined ? ing.ediblePortion : 1.0,
        ediblePricePer500: ing.ediblePricePer500 || null,
        weightPerUnit: ing.weightPerUnit || null,
        classification: ing.classification || null,
        description: ing.description || '',
        mainFunction: ing.mainFunction || '',
        // 新增字段
        subject: ing.subject || null, // 所属科目（仅食材）
        part: ing.part || null, // 部位（仅食材）
        originType: ing.originType || null, // 产地类型（仅食材）
        model: ing.model || null, // 型号（所有分类）
        mainNutrient: (ing.mainNutrient !== null && ing.mainNutrient !== undefined && ing.mainNutrient !== '') ? ing.mainNutrient : null, // 主要营养素（仅营养补充剂）
        unitContent: (ing.unitContent !== null && ing.unitContent !== undefined) ? ing.unitContent : null, // 营养素含量/单位（仅营养补充剂）- 注意：0 是有效值，不应该转换为 null
        nutrientUnit: (ing.nutrientUnit !== null && ing.nutrientUnit !== undefined && ing.nutrientUnit !== '') ? ing.nutrientUnit : null, // 营养素单位（仅营养补充剂）
        pricePer100NutrientUnit: (ing.pricePer100NutrientUnit !== null && ing.pricePer100NutrientUnit !== undefined) ? ing.pricePer100NutrientUnit : null, // 每100营养素单位价格（仅营养补充剂）- 注意：0 是有效值
        createdAt: ing.createdAt ? new Date(ing.createdAt).getTime() : Date.now(),
        updatedAt: ing.updatedAt ? new Date(ing.updatedAt).getTime() : Date.now(),
        // 保存后端ID用于更新和删除
        _backendId: ing.id
      };
    });
    
    // 更新store
    store.ingredients = ingredients;
    store.totalIngredients = data.total || 0;
    store.ingredientTotalPages = data.totalPages || 1;
    
    // 从加载的原料中提取所有已使用的采购渠道，并添加到下拉框选项
    const usedSources = new Set();
    ingredients.forEach(ing => {
      if (ing.source && ing.source.trim()) {
        usedSources.add(ing.source.trim());
      }
    });
    
    if (usedSources.size > 0) {
      const currentSources = getSources();
      const sourcesToAdd = Array.from(usedSources).filter(s => !currentSources.includes(s));
      if (sourcesToAdd.length > 0) {
        console.log('[loadIngredientsFromBackend] Adding new sources from ingredients:', sourcesToAdd);
        const updatedSources = [...currentSources, ...sourcesToAdd];
        saveSources(updatedSources);
      }
    }
    
    // 从加载的原料中提取所有已使用的单位，并添加到下拉框选项
    const usedUnits = new Set();
    ingredients.forEach(ing => {
      if (ing.unit && ing.unit.trim()) {
        usedUnits.add(ing.unit.trim());
      }
    });
    
    if (usedUnits.size > 0) {
      const currentUnits = getUnits();
      const unitsToAdd = Array.from(usedUnits).filter(u => !currentUnits.includes(u));
      if (unitsToAdd.length > 0) {
        console.log('[loadIngredientsFromBackend] Adding new units from ingredients:', unitsToAdd);
        const updatedUnits = [...currentUnits, ...unitsToAdd];
        saveUnits(updatedUnits);
      }
    }
    
    // 从加载的原料中提取所有已使用的主要营养素，并添加到下拉框选项
    const usedMainNutrients = new Set();
    ingredients.forEach(ing => {
      if (ing.mainNutrient && ing.mainNutrient.trim()) {
        usedMainNutrients.add(ing.mainNutrient.trim());
      }
    });
    
    if (usedMainNutrients.size > 0) {
      const currentMainNutrients = getMainNutrients();
      const mainNutrientsToAdd = Array.from(usedMainNutrients).filter(m => !currentMainNutrients.includes(m));
      if (mainNutrientsToAdd.length > 0) {
        console.log('[loadIngredientsFromBackend] Adding new main nutrients from ingredients:', mainNutrientsToAdd);
        const updatedMainNutrients = [...currentMainNutrients, ...mainNutrientsToAdd];
        saveMainNutrients(updatedMainNutrients);
      }
    }
    
    // 从加载的原料中提取所有已使用的所属科目，并添加到下拉框选项
    const usedSubjects = new Set();
    ingredients.forEach(ing => {
      if (ing.subject && ing.subject.trim()) {
        usedSubjects.add(ing.subject.trim());
      }
    });
    
    if (usedSubjects.size > 0) {
      const currentSubjects = getSubjects();
      const subjectsToAdd = Array.from(usedSubjects).filter(s => !currentSubjects.includes(s));
      if (subjectsToAdd.length > 0) {
        console.log('[loadIngredientsFromBackend] Adding new subjects from ingredients:', subjectsToAdd);
        const updatedSubjects = [...currentSubjects, ...subjectsToAdd];
        saveSubjects(updatedSubjects);
      }
    }
    
    // 从加载的原料中提取所有已使用的部位，并添加到下拉框选项
    const usedParts = new Set();
    ingredients.forEach(ing => {
      if (ing.part && ing.part.trim()) {
        usedParts.add(ing.part.trim());
      }
    });
    
    if (usedParts.size > 0) {
      const currentParts = getParts();
      const partsToAdd = Array.from(usedParts).filter(p => !currentParts.includes(p));
      if (partsToAdd.length > 0) {
        console.log('[loadIngredientsFromBackend] Adding new parts from ingredients:', partsToAdd);
        const updatedParts = [...currentParts, ...partsToAdd];
        saveParts(updatedParts);
      }
    }
    
    // 从加载的原料中提取所有已使用的产地类型，并添加到下拉框选项
    const usedOriginTypes = new Set();
    ingredients.forEach(ing => {
      if (ing.originType && ing.originType.trim()) {
        usedOriginTypes.add(ing.originType.trim());
      }
    });
    
    if (usedOriginTypes.size > 0) {
      const currentOriginTypes = getOriginTypes();
      const originTypesToAdd = Array.from(usedOriginTypes).filter(o => !currentOriginTypes.includes(o));
      if (originTypesToAdd.length > 0) {
        console.log('[loadIngredientsFromBackend] Adding new origin types from ingredients:', originTypesToAdd);
        const updatedOriginTypes = [...currentOriginTypes, ...originTypesToAdd];
        saveOriginTypes(updatedOriginTypes);
      }
    }
    
    console.log(`✓ 从后端加载了 ${ingredients.length} 条原料记录（共 ${data.total} 条）`);
    
    renderIngredientsList();
    // 加载所有数据来填充筛选下拉框
    await loadAllIngredientsForFilters();
    
    // 后台预加载常用分类数据（不阻塞列表显示）
    setTimeout(() => {
      preloadCommonCategories().catch(err => {
        // 静默处理预加载错误，不显示任何错误信息
        // 404/484错误是预期的，API可能还未完全实现
      });
    }, 500); // 延迟500ms，避免影响列表加载
  } catch (error) {
    console.error('加载原料列表失败:', error);
    // 如果是401错误，不显示alert，只显示空列表
    if (error.message && error.message.includes('401')) {
      console.warn('未登录或token过期，请重新登录');
      store.ingredients = [];
      store.totalIngredients = 0;
      store.ingredientTotalPages = 1;
      renderIngredientsList();
    } else {
      // 其他错误才显示alert
      alert('加载原料列表失败：' + error.message);
      store.ingredients = [];
      store.totalIngredients = 0;
      store.ingredientTotalPages = 1;
      renderIngredientsList();
    }
  }
}

// 原料数据缓存（用于存储按需查询的数据）
const ingredientCache = new Map();

// 获取原料数据的统一函数（支持按需查询和缓存）
async function getIngredientById(id) {
  if (!id) return null;
  
  // 1. 先从 store.ingredients 查找（当前页数据）
  let ing = store.ingredients.find(x => x.id === id);
  if (ing) {
    // 存入缓存，避免重复查找
    ingredientCache.set(id, ing);
    return ing;
  }
  
  // 2. 从缓存查找
  if (ingredientCache.has(id)) {
    return ingredientCache.get(id);
  }
  
  // 3. 从后端API查询（按需加载）
  if (!backendState.token) {
    console.warn('[getIngredientById] 未登录，无法从后端查询原料数据');
    return null;
  }
  
  try {
    // 提取后端ID（去掉 ing_ 前缀）
    const backendId = id.startsWith('ing_') ? id.replace('ing_', '') : id;
    const response = await backendRequest(`/api/v1/ingredients/${backendId}`);
    
    if (response) {
      // 转换为前端格式（与 loadIngredientsFromBackend 保持一致）
      const sourceValue = (response.source !== null && response.source !== undefined && response.source !== '') 
        ? String(response.source).trim() 
        : '';
      
      ing = {
        id: `ing_${response.id}`,
        code: response.code || '',
        category: response.category || '',
        name: response.name || '',
        brand: response.brand || '',
        source: sourceValue,
        cost: response.cost || null,
        quantity: response.quantity || null,
        unit: response.unit || 'g',
        pricePer500: response.pricePer500 || null,
        ediblePortion: response.ediblePortion !== undefined ? response.ediblePortion : 1.0,
        ediblePricePer500: response.ediblePricePer500 || null,
        weightPerUnit: response.weightPerUnit || null,
        classification: response.classification || null,
        description: response.description || '',
        mainFunction: response.mainFunction || '',
        subject: (response.subject !== null && response.subject !== undefined && response.subject !== '') ? response.subject : null,
        part: (response.part !== null && response.part !== undefined && response.part !== '') ? response.part : null,
        originType: (response.originType !== null && response.originType !== undefined && response.originType !== '') ? response.originType : null,
        model: (response.model !== null && response.model !== undefined && response.model !== '') ? response.model : null,
        mainNutrient: (response.mainNutrient !== null && response.mainNutrient !== undefined && response.mainNutrient !== '') ? response.mainNutrient : null,
        unitContent: (response.unitContent !== null && response.unitContent !== undefined) ? response.unitContent : null,
        nutrientUnit: (response.nutrientUnit !== null && response.nutrientUnit !== undefined && response.nutrientUnit !== '') ? response.nutrientUnit : null,
        pricePer100NutrientUnit: (response.pricePer100NutrientUnit !== null && response.pricePer100NutrientUnit !== undefined) ? response.pricePer100NutrientUnit : null,
        createdAt: response.createdAt ? new Date(response.createdAt).getTime() : Date.now(),
        updatedAt: response.updatedAt ? new Date(response.updatedAt).getTime() : Date.now(),
        _backendId: response.id
      };
      
      // 存入缓存
      ingredientCache.set(id, ing);
      
      // 可选：也添加到 store.ingredients（如果不在当前页）
      const existsInStore = store.ingredients.some(i => i.id === id);
      if (!existsInStore) {
        store.ingredients.push(ing);
      }
      
      console.log(`[getIngredientById] 从后端查询并缓存原料数据: ${id}`);
      return ing;
    }
  } catch (error) {
    console.error(`[getIngredientById] 无法从后端查询原料数据 (ID: ${id}):`, error);
    // 不抛出错误，返回 null，让调用者处理
    return null;
  }
  
  return null;
}

// 从后端加载顾客和宠物数据
async function loadCustomersFromBackend() {
  if (!backendState.token) {
    console.log('未登录，无法加载顾客数据');
    // 清空数据并渲染空列表
    store.customers = [];
    store.totalCustomers = 0;
    store.totalPages = 1;
    renderCustomersList();
    return;
  }
  
  try {
    console.log('从后端加载顾客和宠物数据...');
    const searchQuery = ($('customer-search')?.value || '').trim();
    const params = new URLSearchParams({
      page: String(store.page || 1),
      pageSize: String(store.pageSize || 10)
    });
    if (searchQuery) {
      params.append('search', searchQuery);
    }
    
    const response = await backendRequest(`/api/v1/pets?${params.toString()}`, {
      method: 'GET'
    });
    
    // 后端返回格式: {success: true, data: {items: [], total: 0, ...}}
    const data = response?.data || response;
    
    if (data && data.items) {
      // 将后端数据格式转换为Web端格式
      const customers = await Promise.all(data.items.map(async (pet) => {
        // 加载所有地址（使用管理员API）
        let allAddresses = '';
        let addressList = [];
        
        if (pet.userId && backendState.token) {
          try {
            console.log(`加载用户 ${pet.userId} 的地址...`);
            const addresses = await backendRequest(`/api/v1/addresses/customer/${pet.userId}`, {
              method: 'GET'
            });
            console.log(`用户 ${pet.userId} 的地址响应:`, addresses);
            // 处理返回格式：可能是数组或 {items: []}
            addressList = Array.isArray(addresses) ? addresses : (addresses.items || []);
            if (addressList && addressList.length > 0) {
              // 按默认地址优先排序
              const sortedAddressList = [...addressList].sort((a, b) => {
                if (a.isDefault && !b.isDefault) return -1;
                if (!a.isDefault && b.isDefault) return 1;
                return 0;
              });
              
              // 格式化所有地址显示，换行显示并标注默认地址
              const addressParts = sortedAddressList.map(addr => {
                const parts = [];
                if (addr.contactName) parts.push(addr.contactName);
                if (addr.contactPhone) parts.push(addr.contactPhone);
                if (addr.region) parts.push(addr.region);
                if (addr.detail) parts.push(addr.detail);
                const addrStr = parts.join(' ');
                const isDefault = addr.isDefault ? ' (默认)' : '';
                return addrStr + isDefault;
              });
              // 使用换行符分隔地址（在文本框中会显示为换行）
              allAddresses = addressParts.join('\n');
            }
          } catch (error) {
            console.warn(`加载用户 ${pet.userId} 的地址失败:`, error);
            // 地址加载失败不影响其他数据加载
          }
        } else {
          if (!pet.userId) {
            console.warn(`宠物 ${pet.id} 没有 userId`);
          }
          if (!backendState.token) {
            console.warn('未登录，无法加载地址');
          }
        }
        
        return {
          id: `pet_${pet.id}`, // 使用pet_前缀避免ID冲突
          petName: pet.name || '',
          breed: pet.breed || '',
          wechat: pet.userContactInfo || pet.userEmail || '',
          address: allAddresses,
          birthday: pet.birthdate ? (() => {
            console.log(`处理生日数据 - 原始值:`, pet.birthdate, '类型:', typeof pet.birthdate);
            // 后端已使用 DATE_FORMAT 返回 YYYY-MM-DD 格式的字符串
            if (typeof pet.birthdate === 'string') {
              // 如果是ISO格式（带T），提取日期部分
              if (pet.birthdate.includes('T')) {
                const result = pet.birthdate.split('T')[0];
                console.log(`ISO格式转换: ${pet.birthdate} -> ${result}`);
                return result;
              }
              // 如果是空格分隔的日期时间，提取日期部分
              if (pet.birthdate.includes(' ')) {
                const result = pet.birthdate.split(' ')[0];
                console.log(`空格分隔转换: ${pet.birthdate} -> ${result}`);
                return result;
              }
              // 如果已经是 YYYY-MM-DD 格式，直接返回
              if (pet.birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.log(`直接使用: ${pet.birthdate}`);
                return pet.birthdate;
              }
              console.warn(`无法识别的日期格式: ${pet.birthdate}`);
            }
            // 如果是Date对象（备用处理），转换为UTC日期字符串
            if (pet.birthdate instanceof Date) {
              const year = pet.birthdate.getUTCFullYear();
              const month = String(pet.birthdate.getUTCMonth() + 1).padStart(2, '0');
              const day = String(pet.birthdate.getUTCDate()).padStart(2, '0');
              const result = `${year}-${month}-${day}`;
              console.log(`Date对象转换: ${pet.birthdate} -> ${result}`);
              return result;
            }
            console.warn(`无法处理的生日数据:`, pet.birthdate);
            return '';
          })() : '', // 格式化为 YYYY-MM-DD
        weightKg: pet.weightKg || 0,
        sex: pet.sex || 'unknown',
        neutered: pet.neutered ? 'yes' : 'no',
        lifeStage: pet.lifeStage || 'adult',
        activity: pet.activityLevel || '',
        kcalFactor: pet.energyMultiplier || 0,
        estKcal: pet.dailyEnergyKcal || 0,
        bcs: pet.bodyConditionScore || null,
        mealsPerDay: pet.mealsPerDay || null,
        allergies: pet.allergyNote || '',
        avoid: pet.dietaryNote || '',
        fav: '',
        med: pet.symptomNote || '',
        notes: pet.notes || '',
          userId: pet.userId,
          userName: pet.userName || '',
          userEmail: pet.userEmail || '',
          createdAt: pet.createdAt ? new Date(pet.createdAt).getTime() : Date.now()
        };
      }));
      
      // 更新store
      store.customers = customers;
      store.totalCustomers = data.total || 0;
      store.totalPages = data.totalPages || 1;
      
      console.log(`✓ 从后端加载了 ${customers.length} 条宠物记录（共 ${data.total} 条）`);
      
      // 重新渲染列表
      renderCustomersList();
    } else {
      // 如果返回格式不符合预期，尝试直接使用response（可能是直接返回数据而不是包装在data中）
      if (response && Array.isArray(response)) {
        // 如果response本身就是数组，直接使用
        const customers = response.map(pet => ({
          id: `pet_${pet.id}`,
          petName: pet.name || '',
          breed: pet.breed || '',
          wechat: pet.userContactInfo || pet.userEmail || '',
          address: '',
          birthday: pet.birthdate ? (() => {
            // 后端已使用 DATE_FORMAT 返回 YYYY-MM-DD 格式的字符串
            if (typeof pet.birthdate === 'string') {
              // 如果是ISO格式（带T），提取日期部分
              if (pet.birthdate.includes('T')) {
                return pet.birthdate.split('T')[0];
              }
              // 如果是空格分隔的日期时间，提取日期部分
              if (pet.birthdate.includes(' ')) {
                return pet.birthdate.split(' ')[0];
              }
              // 如果已经是 YYYY-MM-DD 格式，直接返回
              if (pet.birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return pet.birthdate;
              }
            }
            // 如果是Date对象（备用处理），转换为UTC日期字符串
            if (pet.birthdate instanceof Date) {
              const year = pet.birthdate.getUTCFullYear();
              const month = String(pet.birthdate.getUTCMonth() + 1).padStart(2, '0');
              const day = String(pet.birthdate.getUTCDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
            return '';
          })() : '',
          weightKg: pet.weightKg || 0,
          sex: pet.sex || 'unknown',
          neutered: pet.neutered ? 'yes' : 'no',
          lifeStage: pet.lifeStage || 'adult',
          activity: pet.activityLevel || '',
          kcalFactor: pet.energyMultiplier != null ? Math.round(Number(pet.energyMultiplier)) : 0,
          estKcal: pet.dailyEnergyKcal || 0,
          bcs: pet.bodyConditionScore || null,
          mealsPerDay: pet.mealsPerDay || null,
          allergies: pet.allergyNote || '',
          avoid: pet.dietaryNote || '',
          fav: '',
          med: pet.symptomNote || '',
          notes: pet.notes || '',
          userId: pet.userId,
          userName: pet.userName || '',
          userEmail: pet.userEmail || '',
          createdAt: pet.createdAt ? new Date(pet.createdAt).getTime() : Date.now()
        }));
        store.customers = customers;
        store.totalCustomers = customers.length;
        store.totalPages = 1;
        console.log(`✓ 从后端加载了 ${customers.length} 条宠物记录（直接数组格式）`);
        renderCustomersList();
      } else {
        console.warn('后端返回数据格式异常，无法解析:', response);
      }
    }
  } catch (error) {
    console.error('从后端加载数据失败:', error);
    // 如果后端加载失败，继续使用本地数据
  }
}

function setupCustomersModule() {
  populateBreedSelect();
  
  // 地址管理按钮事件（使用事件委托，因为按钮是动态显示的）
  document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'c-address-manage') {
      e.preventDefault();
      const customerId = $('customer-id').value;
      if (!customerId) {
        alert('请先选择或创建顾客');
        return;
      }
      
      const customer = store.customers.find(c => c.id === customerId);
      if (!customer || !customer.userId) {
        alert('无法获取用户ID，无法管理地址');
        return;
      }
      
      // 打开地址管理对话框
      await openAddressManagementDialog(customer.userId);
    }
  });
  
  // 如果已登录，从后端加载数据
  if (backendState.token) {
    loadCustomersFromBackend();
  }
  
  const newBtn = $('btn-new-customer');
  if (newBtn) newBtn.addEventListener('click', () => openCustomerForm());
  const cancelBtn = $('btn-cancel-customer');
  if (cancelBtn) cancelBtn.addEventListener('click', () => { const card = $('customer-form-card'); if (card) card.style.display = 'none'; });
  const searchEl = $('customer-search');
  if (searchEl) {
    // 防抖搜索
    let searchTimeout;
    searchEl.addEventListener('input', () => { 
      store.page = 1;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (backendState.token) {
          loadCustomersFromBackend();
        } else {
          renderCustomersList();
        }
      }, 500);
    });
  }

  const bd = $('c-birthday'); 
  if (bd) {
    bd.addEventListener('change', () => { 
      updateLifeStageFromBirthday(); 
      updatePuppyMonthFields(); 
      computeAndFillEstKcal(); 
    });
  }
  const lifeEl = $('c-lifeStage'); 
  if (lifeEl) {
    lifeEl.addEventListener('change', () => { 
      updatePuppyMonthFields(); 
      updateLactationFields(); 
      
      // 小程序端逻辑：如果是新建且没有选择活动水平，根据生命阶段设置默认能量系数
      const customerId = $('customer-id').value;
      const isEditing = customerId && customerId.startsWith('pet_');
      const kcalFactorEl = $('c-kcalFactor');
      const activityEl = $('c-activity');
      
      // 小程序端：如果是新建且没有选择活动水平，根据生命阶段设置默认值
      // 小程序端 LIFE_STAGE_OPTIONS: puppy multiplier=3, adult multiplier=1.8
      // 注意：这些 multiplier 不是能量系数，能量系数应该由活动水平决定
      // 但小程序端在新建时会设置这些值作为临时值，直到用户选择活动水平
      if (!isEditing && (!activityEl || !activityEl.value) && kcalFactorEl) {
        const lifeStage = lifeEl.value;
        let defaultMultiplier = null;
        if (lifeStage === 'puppy') {
          defaultMultiplier = 3; // 小程序端 puppy multiplier=3
        } else if (lifeStage === 'adult') {
          defaultMultiplier = 1.8; // 小程序端 adult multiplier=1.8
        }
        if (defaultMultiplier !== null) {
          kcalFactorEl.value = Math.round(defaultMultiplier);
        }
      }
      
      computeAndFillEstKcal(); 
    });
  }

  const onActivityChange = () => {
    const act = $('c-activity').value;
    // 使用共享工具库获取能量系数
    let factor = null;
    if (typeof PetUtils !== 'undefined' && PetUtils && PetUtils.getEnergyMultiplierByActivity) {
      factor = PetUtils.getEnergyMultiplierByActivity(act);
    } else {
      factor = activityKcalFactor(act);
    }
    const fEl = $('c-kcalFactor'); 
    if (fEl) {
      // 显示为整数
      fEl.value = factor != null ? Math.round(Number(factor)) : '';
    }
    computeAndFillEstKcal();
  };
  const wEl = $('c-weightKg'); if (wEl) wEl.addEventListener('change', computeAndFillEstKcal);
  const actEl = $('c-activity'); if (actEl) actEl.addEventListener('change', onActivityChange);
  const monthFields = ['c-monthAge','c-monthFactor'];
  monthFields.forEach(id => { const el = $(id); if (el) el.addEventListener('change', computeAndFillEstKcal); });

  const lactStageEl = $('c-lactStage'); if (lactStageEl) lactStageEl.addEventListener('change', () => { updateLactationFields(); computeAndFillEstKcal(); });
  const litterEl = $('c-litterCount'); if (litterEl) litterEl.addEventListener('change', computeAndFillEstKcal);

  const form = $('customer-form');
  if (form) {
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        computeAndFillEstKcal();
      }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = $('customer-id').value || '';
      const weight = Number($('c-weightKg').value) || 0;
      if (!weight) { alert('请填写体重'); return; }
      computeAndFillEstKcal();
      const estKcal = Number($('c-estKcal').value) || 0;

      // 验证必填项
      const petName = $('c-petName').value.trim();
      if (!petName) { alert('请填写必填项：宠物昵称'); return; }
      
      // 获取品种值：如果是"其它品种"，使用输入框的值
      const breedSelect = $('c-breed');
      const breedOtherInput = $('c-breed-other');
      let breed = breedSelect ? breedSelect.value.trim() : '';
      
      if (breed === '其它品种') {
        breed = breedOtherInput ? breedOtherInput.value.trim() : '';
        if (!breed) {
          alert('请填写其它品种名称');
          if (breedOtherInput) breedOtherInput.focus();
          return;
        }
      }
      
      if (!breed) { alert('请填写必填项：品种'); return; }
      
      const birthday = $('c-birthday').value;
      if (!birthday) { alert('请填写必填项：生日（至少选择年月）'); return; }
      
      const activity = $('c-activity').value;
      if (!activity) { alert('请填写必填项：活动水平'); return; }
      
      const bcs = $('c-bcs').value ? Number($('c-bcs').value) : null;
      if (!bcs) { alert('请填写必填项：体况评分'); return; }
      
      const mealsPerDay = $('c-mealsPerDay').value ? Number($('c-mealsPerDay').value) : null;
      if (!mealsPerDay) { alert('请填写必填项：每日进餐数'); return; }

      // 判断是编辑还是新增
      const isEditing = id && id.startsWith('pet_');
      const petId = isEditing ? id.replace('pet_', '') : null;
      const existingRecord = isEditing ? store.customers.find(x => x.id === id) : null;
      
      // 获取userId（编辑时使用现有的，新增时需要查找或创建用户）
      let userId = existingRecord?.userId;
      const wechat = $('c-wechat').value.trim();
      const userEmail = existingRecord?.userEmail || (wechat.includes('@') ? wechat : null);
      
      // 获取主人昵称
      const userName = $('c-userName').value.trim();
      
      // 如果是新增且没有userId，需要查找或创建用户
      if (!isEditing && !userId) {
        const wechat = $('c-wechat').value.trim();
        const userEmail = wechat.includes('@') ? wechat : null;
        
        if (userEmail || wechat) {
          try {
            // 尝试通过email或contactInfo查找用户
            const searchQuery = userEmail || wechat;
            const usersResponse = await backendRequest(`/api/v1/users?search=${encodeURIComponent(searchQuery)}&role=customer`, {
              method: 'GET'
            });
            const usersData = usersResponse?.data || usersResponse;
            if (usersData && usersData.items && usersData.items.length > 0) {
              userId = usersData.items[0].id;
              console.log('找到用户:', userId);
              // 如果用户存在且有主人昵称，更新用户名称
              if (userName && usersData.items[0].name !== userName) {
                try {
                  await backendRequest(`/api/v1/users/${userId}`, {
                    method: 'PUT',
                    body: { name: userName }
                  });
                  console.log('✓ 用户名称已更新');
                } catch (error) {
                  console.warn('更新用户名称失败:', error);
                }
              }
            } else {
              // 如果找不到用户，提示管理员
              alert('未找到对应的用户。请先在"账号管理"中创建用户，或确保微信号/邮箱正确。');
              return;
            }
          } catch (error) {
            console.error('查找用户失败:', error);
            alert('查找用户失败: ' + (error.message || '未知错误') + '\n请先在"账号管理"中创建用户。');
            return;
          }
        } else {
          alert('请填写微信号或邮箱，以便关联用户');
          return;
        }
      } else if (isEditing && userId && userName) {
        // 编辑时，如果用户存在且有主人昵称，更新用户名称
        try {
          await backendRequest(`/api/v1/users/${userId}`, {
            method: 'PUT',
            body: { name: userName }
          });
          console.log('✓ 用户名称已更新');
        } catch (error) {
          console.warn('更新用户名称失败:', error);
        }
      }
      
      if (!userId) {
        alert('无法确定用户ID。编辑模式下请确保数据已正确加载。');
        return;
      }

      // 将Web端格式转换为后端API格式
      const payload = {
        name: petName,
        breed: breed || null,
        birthdate: birthday || null,
        weightKg: weight || null,
        sex: $('c-sex').value || 'unknown',
        neutered: $('c-neutered').value === 'yes',
        lifeStage: $('c-lifeStage').value || null,
        activityLevel: activity || null,
        energyMultiplier: $('c-kcalFactor').value ? Math.round(Number($('c-kcalFactor').value)) : null,
        dailyEnergyKcal: estKcal || null,
        bodyConditionScore: bcs || null,
        mealsPerDay: mealsPerDay || null,
        snackAmount: null, // Web端暂时没有这个字段
        dietaryNote: $('c-avoid').value.trim() || null,
        allergyNote: $('c-allergies').value.trim() || null,
        symptomNote: $('c-med').value.trim() || null,
        notes: $('c-notes').value.trim() || null,
        userId: userId // 管理员端API需要userId
      };

      // 处理空值
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === undefined) {
          payload[key] = null;
        }
      });

      try {
        // 调用后端API
        if (isEditing && petId) {
          // 更新
          const response = await backendRequest(`/api/v1/pets/${petId}`, {
            method: 'PUT',
            body: payload
          });
          console.log('✓ 后端更新成功:', response);
        } else {
          // 新增
          const response = await backendRequest('/api/v1/pets', {
            method: 'POST',
            body: payload
          });
          console.log('✓ 后端创建成功:', response);
        }
        
        // 成功后重新加载数据
        if (backendState.token) {
          await loadCustomersFromBackend();
        } else {
          // 如果未登录，回退到本地保存
          const record = {
            id: isEditing ? id : `pet_${Date.now()}`,
            wechat: wechat,
            address: $('c-address').value.trim(),
            petName: petName,
            breed: breed,
            birthday: birthday,
            weightKg: weight,
            sex: $('c-sex').value,
            neutered: $('c-neutered').value,
            lifeStage: $('c-lifeStage').value,
            activity: activity,
            kcalFactor: Number($('c-kcalFactor').value) || 0,
            estKcal: estKcal,
            bcs: bcs,
            mealsPerDay: mealsPerDay,
            allergies: $('c-allergies').value.trim(),
            avoid: $('c-avoid').value.trim(),
            med: $('c-med').value.trim(),
            notes: $('c-notes').value.trim(),
            userId: userId,
            createdAt: Date.now()
          };
          const existsIdx = store.customers.findIndex(x => x.id === id);
          if (existsIdx >= 0) {
            store.customers.splice(existsIdx, 1, record);
          } else {
            store.customers.unshift(record);
          }
          saveApp();
        }
        
        const card = $('customer-form-card'); 
        if (card) card.style.display = 'none';
        renderCustomersList();
        alert('保存成功！');
      } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败: ' + (error.message || '未知错误'));
      }
    });
  }
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  if (priceEditArea && !priceEditArea.dataset.editing) {
    priceEditArea.dataset.editing = manualFoodMakingOrderPrice != null ? 'true' : 'false';
  }

  const quoteSearchInput = $('quote-recipe-search');
  if (quoteSearchInput) {
    quoteSearchInput.addEventListener('input', (e) => {
      quoteRecipeFilter.search = (e.target.value || '').trim();
      renderQuoteRecipeList();
    });
  }
  const quoteLifeStageFilterEl = $('quote-lifeStage-filter');
  if (quoteLifeStageFilterEl) {
    quoteLifeStageFilterEl.addEventListener('change', (e) => {
      quoteRecipeFilter.lifeStage = e.target.value || '';
      renderQuoteRecipeList();
    });
  }
  const quoteCancelBtn = $('btn-quote-cancel');
  if (quoteCancelBtn) {
    quoteCancelBtn.addEventListener('click', () => {
      closeQuoteRecipeSelector();
    });
  }
  const quoteGenerateBtn = $('btn-quote-generate');
  if (quoteGenerateBtn) {
    quoteGenerateBtn.addEventListener('click', () => {
      generateQuoteComparison();
    });
  }
  const quoteResultCloseBtn = $('btn-close-quote-result');
  if (quoteResultCloseBtn) {
    quoteResultCloseBtn.addEventListener('click', () => {
      closeQuoteResult();
    });
  }
  const quoteExportBtn = $('btn-export-quote-image');
  if (quoteExportBtn) {
    quoteExportBtn.addEventListener('click', () => {
      exportQuoteImage();
    });
  }
}

// ========== 原料管理模块 ==========

// ============================================
// 根据分类动态显示/隐藏字段
// ============================================
function updateIngredientFieldsVisibility(classification) {
  if (!classification) {
    // 如果分类为空，隐藏所有分类特定字段
    const allFields = [
      'i-subject-label', 'i-part-label', 'i-originType-label', 
      'i-brand-label', 'i-model-label', 'i-source-label', 
      'i-cost-label', 'i-quantity-label', 'i-unit-label',
      'i-ediblePortion-label', 'i-unitContent-label', 'i-mainFunction-label',
      'i-weightPerUnit-label'
    ];
    allFields.forEach(fieldId => {
      const field = $(fieldId);
      if (field) field.style.display = 'none';
    });
    
    // 隐藏 i-name 字段并移除 required 属性
    const nameLabel = $('i-name-label');
    const nameSelect = $('i-name');
    if (nameLabel) nameLabel.style.display = 'none';
    if (nameSelect) {
      nameSelect.required = false;
      nameSelect.removeAttribute('required');
    }
    
    return;
  }
  
  // 定义字段与分类的映射关系
  const fieldConfig = {
    // 食材分类显示的字段
    '食材': {
      show: [
        'i-subject-label',      // 所属科目
        'i-part-label',         // 部位
        'i-originType-label',   // 产地类型
        'i-brand-label',        // 品牌
        'i-model-label',        // 型号
        'i-source-label',       // 采购渠道
        'i-cost-label',         // 费用（采购价格）
        'i-quantity-label',     // 单量（采购数量）
        'i-unit-label',         // 单位
        'i-ediblePortion-label', // 可食部
        'i-pricePer500-label',  // 单价/500单位
        'i-ediblePricePer500-label', // 可食部单价/500单位
        'i-mainFunction-label'   // 主要营养价值
      ],
      hide: [
        'i-unitContent-label', 
        'i-weightPerUnit-label', 
        'i-pricePerUnit-label',
        'i-mainNutrient-label',      // 不显示主要营养素
        'i-nutrientUnit-label',      // 不显示营养素单位
        'i-pricePer100NutrientUnit-label' // 不显示价格/100营养素单位
      ]
    },
    // 营养补充剂分类显示的字段
    '营养补充剂': {
      show: [
        'i-brand-label',        // 品牌
        'i-model-label',        // 型号
        'i-source-label',       // 采购渠道
        'i-cost-label',         // 费用（采购价格）
        'i-quantity-label',     // 单量（采购数量）
        'i-unit-label',         // 采购单位
        'i-mainNutrient-label', // 主要营养素（新增）
        'i-unitContent-label',  // 营养素含量/单位
        'i-nutrientUnit-label', // 营养素单位
        'i-pricePer100NutrientUnit-label', // 每100营养素单位价格（新增）
        'i-description-label',  // 说明
        'i-mainFunction-label'  // 主要营养价值
      ],
      hide: [
        'i-subject-label', 
        'i-part-label', 
        'i-originType-label', 
        'i-weightPerUnit-label', 
        'i-pricePerUnit-label',
        'i-ediblePortion-label',  // 不显示可食部
        'i-pricePer500-label',    // 不显示单价/500采购单位
        'i-ediblePricePer500-label' // 不显示可食部单价/500采购单位
      ]
    },
    // 包材分类显示的字段
    '包材': {
      show: [
        'i-brand-label',        // 品牌
        'i-model-label',        // 型号
        'i-source-label',       // 采购渠道
        'i-cost-label',         // 费用（采购价格）
        'i-quantity-label',     // 单量（采购数量）
        'i-unit-label',         // 单位
        'i-weightPerUnit-label', // 每单位重量（仅包材显示）
        'i-pricePerUnit-label'  // 价格/单位（仅包材显示）
      ],
      hide: [
        'i-subject-label', 
        'i-part-label', 
        'i-originType-label', 
        'i-ediblePortion-label', 
        'i-unitContent-label', 
        'i-mainFunction-label',
        'i-pricePer500-label',
        'i-ediblePricePer500-label',
        'i-mainNutrient-label',      // 不显示主要营养素
        'i-nutrientUnit-label',      // 不显示营养素单位
        'i-pricePer100NutrientUnit-label' // 不显示价格/100营养素单位
      ]
    }
  };
  
  const config = fieldConfig[classification] || { show: [], hide: [] };
  
  // 显示字段
  config.show.forEach(fieldId => {
    const field = $(fieldId);
    if (field) {
      // 移除内联样式中的 display 属性
      field.style.removeProperty('display');
      // 如果移除后仍然是 none（可能被CSS规则隐藏），强制设置为 block
      // 使用 requestAnimationFrame 确保在下一帧检查
      requestAnimationFrame(() => {
        const computedDisplay = window.getComputedStyle(field).display;
        if (computedDisplay === 'none') {
          field.style.setProperty('display', 'block', 'important');
        }
      });
    }
  });
  
  // 隐藏字段并清空值
  config.hide.forEach(fieldId => {
    const field = $(fieldId);
    if (field) {
      field.style.display = 'none';
      // 清空隐藏字段的值
      const inputId = fieldId.replace('-label', '');
      const input = $(inputId);
      if (input) {
        if (input.tagName === 'SELECT') {
          input.value = '';
        } else if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
          input.value = '';
        }
      }
    }
  });
  
  // 根据分类处理 i-name 字段的显示和 required 属性
  const nameLabel = $('i-name-label');
  const nameSelect = $('i-name');
  
  if (classification === '包材') {
    // 包材分类：隐藏食材名称字段并移除 required 属性
    if (nameLabel) nameLabel.style.display = 'none';
    if (nameSelect) {
      nameSelect.required = false;
      nameSelect.removeAttribute('required');
      nameSelect.value = ''; // 清空值
    }
  } else {
    // 非包材分类：显示食材名称字段并设置 required 属性
    if (nameLabel) nameLabel.style.display = '';
    if (nameSelect) {
      nameSelect.required = true;
      nameSelect.setAttribute('required', 'required');
    }
  }
}

// ============================================
// 预加载常用分类的类别和项目数据
// ============================================
async function preloadCommonCategories() {
  if (preloadInProgress || !backendState.token) return;
  preloadInProgress = true;
  
  try {
    // 预加载常用分类
    const commonClassifications = ['食材', '包材'];
    const preloadPromises = commonClassifications.map(async (classification) => {
      try {
        // 检查缓存
        const cached = categoriesCache.get(classification);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log(`[Preload] Categories for ${classification} already cached`);
          return;
        }
        
        // 从后端加载类别数据并缓存
        const categories = await loadCategoriesFromBackend(classification);
        categoriesCache.set(classification, {
          data: categories,
          timestamp: Date.now()
        });
        if (categories.length > 0) {
          console.log(`[Preload] Preloaded ${categories.length} categories for: ${classification}`);
        } else {
          // 静默处理，不显示警告（API可能还未完全实现）
          console.log(`[Preload] Preloaded 0 categories for: ${classification}`);
        }
      } catch (error) {
        // 完全静默处理预加载错误，不输出任何日志
        // 404/400/484错误是预期的，API可能还未完全实现
        // 不显示任何错误信息，避免控制台报错
      }
    });
    
    await Promise.all(preloadPromises);
  } catch (error) {
    console.warn('[Preload] Preload error:', error);
  } finally {
    preloadInProgress = false;
  }
}

// 从后端加载分类并填充到表单下拉框
async function loadCategoriesForForm(classification, useCache = true) {
  const categorySelect = $('i-category');
  if (!categorySelect) return null;
  
  // 检查缓存
  if (useCache) {
    const cached = categoriesCache.get(classification);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      // 使用缓存数据
      categorySelect.innerHTML = '<option value="">请选择类别</option>';
      cached.data.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.category;
        opt.textContent = cat.category;
        categorySelect.appendChild(opt);
      });
      return cached.data;
    }
  }
  
  categorySelect.innerHTML = '<option value="">加载中...</option>';
  
  try {
    const categories = await loadCategoriesFromBackend(classification);
    
    // 更新缓存
    categoriesCache.set(classification, {
      data: categories,
      timestamp: Date.now()
    });
    
    categorySelect.innerHTML = '<option value="">请选择类别</option>';
    
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.category;
      opt.textContent = cat.category;
      categorySelect.appendChild(opt);
    });
    
    return categories;
  } catch (error) {
    // 如果加载失败，尝试从现有原料数据中提取类别
    const errorMessage = error.message || '';
    
    // 404/400错误或网络错误时，从现有数据中提取类别
    if (errorMessage.includes('404') || errorMessage.includes('Not Found') || 
        errorMessage.includes('400') || errorMessage.includes('CORS') || 
        errorMessage.includes('Failed to fetch') || errorMessage.includes('网络')) {
      console.log('从现有数据中提取类别');
      // 从store.ingredients中提取该分类下的所有类别
      const existingCategories = [...new Set(
        store.ingredients
          .filter(ing => ing.classification === classification && ing.category)
          .map(ing => ing.category)
      )].sort();
      
      if (existingCategories.length > 0) {
        categorySelect.innerHTML = '<option value="">请选择类别</option>';
        existingCategories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          categorySelect.appendChild(opt);
        });
        console.log(`从现有数据中加载了 ${existingCategories.length} 个类别`);
        return existingCategories.map(cat => ({ category: cat }));
      } else {
        categorySelect.innerHTML = '<option value="">暂无类别数据</option>';
      }
    } else {
      // 其他错误才显示错误信息
      console.error('加载分类失败:', error);
      categorySelect.innerHTML = '<option value="">加载失败</option>';
    }
    return null;
  }
}

function populateCategorySelects() {
  const categorySelect = $('i-category');
  const categoryFilterSelect = $('ingredient-category-filter');
  
  // 如果元素不存在，直接返回
  if (!categorySelect) {
    return;
  }
  
  // 如果原料分类已选择，从后端加载对应的类别
  const classificationSelect = $('i-classification');
  if (classificationSelect && classificationSelect.value) {
    // 异步加载，不阻塞
    loadCategoriesForForm(classificationSelect.value).catch(err => {
      // 404/400/484错误时静默处理，不显示错误
      const errorMessage = err.message || '';
      if (!errorMessage.includes('404') && !errorMessage.includes('Not Found') && 
          !errorMessage.includes('400') && !errorMessage.includes('484') &&
          !errorMessage.includes('Resource not found')) {
        console.error('加载分类失败:', err);
      }
      // 失败时使用旧的静态列表
      if (categorySelect) {
        categorySelect.innerHTML = '<option value="">请选择类别</option>';
        INGREDIENT_CATEGORIES.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          categorySelect.appendChild(opt);
        });
      }
    });
  } else {
    // 如果没有选择分类，使用旧的静态列表
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">请选择类别</option>';
      INGREDIENT_CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
      });
    }
  }
  
  // 类别筛选下拉框由updateIngredientFilterSelects统一管理
  // 这里不再单独填充，避免与动态数据冲突
}

// 从数据中提取唯一值并更新筛选下拉框
function updateFilterSelectsFromData(ingredients) {
  if (!ingredients || !Array.isArray(ingredients)) {
    console.warn('[updateFilterSelectsFromData] ingredients is not available');
    return;
  }
  
  // 类别筛选
  const categoryFilterSelect = $('ingredient-category-filter');
  if (categoryFilterSelect) {
    const uniqueCategories = [...new Set(ingredients.map(ing => ing.category).filter(Boolean))].sort();
    const currentValue = categoryFilterSelect.value; // 保存当前选中的值
    categoryFilterSelect.innerHTML = '<option value="">类别</option>';
    uniqueCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilterSelect.appendChild(opt);
    });
    // 恢复之前选中的值
    if (currentValue) {
      categoryFilterSelect.value = currentValue;
    }
  }
  
  // 所属科目筛选
  const subjectFilterSelect = $('ingredient-subject-filter');
  if (subjectFilterSelect) {
    const uniqueSubjects = [...new Set(ingredients.map(ing => ing.subject).filter(Boolean))].sort();
    const currentValue = subjectFilterSelect.value; // 保存当前选中的值
    subjectFilterSelect.innerHTML = '<option value="">所属科目</option>';
    uniqueSubjects.forEach(subject => {
      const opt = document.createElement('option');
      opt.value = subject;
      opt.textContent = subject;
      subjectFilterSelect.appendChild(opt);
    });
    // 恢复之前选中的值
    if (currentValue) {
      subjectFilterSelect.value = currentValue;
    }
  }
  
  // 部位筛选
  const partFilterSelect = $('ingredient-part-filter');
  if (partFilterSelect) {
    const uniqueParts = [...new Set(ingredients.map(ing => ing.part).filter(Boolean))].sort();
    const currentValue = partFilterSelect.value; // 保存当前选中的值
    partFilterSelect.innerHTML = '<option value="">部位</option>';
    uniqueParts.forEach(part => {
      const opt = document.createElement('option');
      opt.value = part;
      opt.textContent = part;
      partFilterSelect.appendChild(opt);
    });
    // 恢复之前选中的值
    if (currentValue) {
      partFilterSelect.value = currentValue;
    }
  }
  
  // 产地类型筛选
  const originTypeFilterSelect = $('ingredient-origin-type-filter');
  if (originTypeFilterSelect) {
    const uniqueOriginTypes = [...new Set(ingredients.map(ing => ing.originType).filter(Boolean))].sort();
    const currentValue = originTypeFilterSelect.value; // 保存当前选中的值
    originTypeFilterSelect.innerHTML = '<option value="">产地类型</option>';
    uniqueOriginTypes.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      originTypeFilterSelect.appendChild(opt);
    });
    // 恢复之前选中的值
    if (currentValue) {
      originTypeFilterSelect.value = currentValue;
    }
  }
}

// 从后端加载所有数据用于填充筛选下拉框（不更新store.ingredients）
async function loadAllIngredientsForFilters() {
  if (!backendState.token) {
    // 未登录时使用本地数据
    updateIngredientFilterSelects();
    return;
  }
  
  try {
    // 获取所有数据（不应用筛选条件，使用大pageSize）
    const data = await backendRequest('/api/v1/ingredients?pageSize=10000');
    const allIngredients = (data.items || []).map(ing => ({
      category: ing.category || null,
      subject: ing.subject || null,
      part: ing.part || null,
      originType: ing.originType || null
    }));
    
    // 更新筛选下拉框
    updateFilterSelectsFromData(allIngredients);
  } catch (error) {
    console.error('[loadAllIngredientsForFilters] 加载筛选选项失败:', error);
    // 失败时使用当前页数据
    updateIngredientFilterSelects();
  }
}

// 更新筛选下拉框的选项（从当前数据中提取唯一值）- 保留作为降级方案
function updateIngredientFilterSelects() {
  // 确保 store.ingredients 存在且是数组
  if (!store.ingredients || !Array.isArray(store.ingredients)) {
    console.warn('[updateIngredientFilterSelects] store.ingredients is not available');
    return;
  }
  
  // 转换为相同格式
  const ingredients = store.ingredients.map(ing => ({
    category: ing.category || null,
    subject: ing.subject || null,
    part: ing.part || null,
    originType: ing.originType || null
  }));
  
  updateFilterSelectsFromData(ingredients);
}

function calculatePricePer500(cost, quantity, unit) {
  if (!cost || !quantity || quantity <= 0) return 0;
  
  // 直接计算：单价/500单位 = (费用 / 数量) * 500
  // 不管单位是什么（g、kg、个、包等），都按相同逻辑计算，不做单位转换
  return (cost / quantity) * 500;
}

// 计算每100营养素单位价格（仅营养补充剂）
function calculatePricePer100NutrientUnit(cost, quantity, unitContent, nutrientUnit) {
  if (!cost || !quantity || !unitContent || !nutrientUnit) return 0;
  
  // 将营养素含量转换为数字
  const nutrientContent = Number(unitContent);
  if (!nutrientContent || nutrientContent <= 0) return 0;
  
  // 计算每单位采购单位的价格
  const pricePerUnit = cost / quantity;
  
  // 计算每100营养素单位的价格
  // 公式：价格/100营养素单位 = (价格/采购单位) / (营养素含量/采购单位) * 100
  return (pricePerUnit / nutrientContent) * 100;
}

// 根据单位字段动态更新标签文本
function updateUnitBasedLabels() {
  const unitSelect = $('i-unit');
  const pricePerUnitLabel = $('i-pricePerUnit-label');
  const weightPerUnitLabel = $('i-weightPerUnit-label');
  const pricePer500Label = $('i-pricePer500-label');
  const ediblePricePer500Label = $('i-ediblePricePer500-label');
  
  if (!unitSelect) return;
  
  const classification = $('i-classification') ? $('i-classification').value.trim() : '';
  const unit = unitSelect.value.trim();
  const unitDisplay = unit || '-';
  
  // 更新"价格/单位"标签（仅包材）
  if (pricePerUnitLabel && classification === '包材') {
    const input = $('i-pricePerUnit');
    pricePerUnitLabel.innerHTML = `价格/${unitDisplay}`;
    if (input) {
      pricePerUnitLabel.appendChild(input);
    }
  }
  
  // 更新"重量（g）/单位"标签
  if (weightPerUnitLabel) {
    const input = $('i-weightPerUnit');
    weightPerUnitLabel.innerHTML = `重量（g）/${unitDisplay}`;
    if (input) {
      weightPerUnitLabel.appendChild(input);
    }
  }
  
  // 更新"单价/500单位"和"可食部单价/500单位"标签（仅食材）
  if (classification === '食材') {
    if (pricePer500Label) {
      const input = $('i-pricePer500');
      pricePer500Label.innerHTML = `单价/500${unitDisplay}`;
      if (input) {
        pricePer500Label.appendChild(input);
      }
    }
    if (ediblePricePer500Label) {
      const input = $('i-ediblePricePer500');
      ediblePricePer500Label.innerHTML = `可食部单价/500${unitDisplay}`;
      if (input) {
        ediblePricePer500Label.appendChild(input);
      }
    }
  }
  
  // 更新"营养素含量/单位"标签（仅营养补充剂）
  if (classification === '营养补充剂') {
    const unitContentLabelText = $('i-unitContent-label-text');
    if (unitContentLabelText) {
      unitContentLabelText.textContent = `营养素含量/${unitDisplay}`;
    }
    
    // 更新"价格/100营养素单位"标签，动态显示营养素单位和主要营养素
    const pricePer100NutrientUnitLabelText = $('i-pricePer100NutrientUnit-label-text');
    if (pricePer100NutrientUnitLabelText) {
      const nutrientUnit = $('i-nutrientUnit')?.value || '';
      const mainNutrient = $('i-mainNutrient')?.value || '';
      const nutrientUnitDisplay = nutrientUnit || '-';
      const mainNutrientDisplay = mainNutrient || '-';
      const labelText = `价格/100${nutrientUnitDisplay}${mainNutrientDisplay}`;
      pricePer100NutrientUnitLabelText.textContent = labelText;
    }
  }
}

function updateIngredientPriceFields() {
  const cost = Number($('i-cost').value) || 0;
  const quantity = Number($('i-quantity').value) || 0;
  const unit = $('i-unit').value || 'g';
  // 可食部现在是百分比，需要转换为0-1的小数
  const ediblePortionPercent = Number($('i-ediblePortion').value) || 100;
  const ediblePortion = ediblePortionPercent / 100;
  
  // 获取当前分类
  const classification = $('i-classification') ? $('i-classification').value.trim() : '';
  
  // 仍然计算 pricePer500 用于后端保存（兼容性）
  const pricePer500 = calculatePricePer500(cost, quantity, unit);
  const ediblePricePer500 = ediblePortion > 0 ? pricePer500 / ediblePortion : 0;
  
  // 更新隐藏字段（用于后端保存）
  const priceEl = $('i-pricePer500');
  const ediblePriceEl = $('i-ediblePricePer500');
  if (priceEl) priceEl.value = pricePer500.toFixed(4);
  if (ediblePriceEl) ediblePriceEl.value = ediblePricePer500.toFixed(4);
  
  // 根据分类更新显示字段
  if (classification === '包材') {
    // 包材：显示价格/单位
    let pricePerUnit = 0;
    if (quantity > 0) {
      pricePerUnit = cost / quantity;
    }
    const pricePerUnitEl = $('i-pricePerUnit');
    if (pricePerUnitEl) {
      pricePerUnitEl.value = pricePerUnit > 0 ? pricePerUnit.toFixed(4) : '';
    }
    // 更新标签文本
    updateUnitBasedLabels();
  } else if (classification === '营养补充剂') {
    // 营养补充剂：计算并显示每100营养素单位价格
    const unitContent = Number($('i-unitContent')?.value) || 0;
    const nutrientUnit = $('i-nutrientUnit')?.value || '';
    const pricePer100NutrientUnit = calculatePricePer100NutrientUnit(cost, quantity, unitContent, nutrientUnit);
    
    const pricePer100NutrientUnitEl = $('i-pricePer100NutrientUnit');
    if (pricePer100NutrientUnitEl) {
      pricePer100NutrientUnitEl.value = pricePer100NutrientUnit > 0 ? pricePer100NutrientUnit.toFixed(4) : '';
    }
    
    // 更新标签文本
    updateUnitBasedLabels();
  } else {
    // 食材：显示单价/500单位和可食部单价/500单位
    // 这些字段的显示/隐藏由 updateIngredientFieldsVisibility 控制
    // 这里只需要确保值已更新（上面已经更新了）
    const pricePer500Label = $('i-pricePer500-label');
    const ediblePricePer500Label = $('i-ediblePricePer500-label');
    if (pricePer500Label) {
      const pricePer500Input = $('i-pricePer500');
      if (pricePer500Input) {
        pricePer500Input.value = pricePer500.toFixed(4);
      }
    }
    if (ediblePricePer500Label) {
      const ediblePricePer500Input = $('i-ediblePricePer500');
      if (ediblePricePer500Input) {
        ediblePricePer500Input.value = ediblePricePer500.toFixed(4);
      }
    }
  }
}
// 从后端加载项目并填充到表单下拉框
async function loadItemsForForm(categoryId, categoryName) {
  const nameSelect = $('i-name');
  if (!nameSelect) return;
  
  nameSelect.innerHTML = '<option value="">加载中...</option>';
  
  try {
    const items = await loadItemsFromBackend(categoryId);
    nameSelect.innerHTML = '<option value="">请选择食材名称</option>';
    
    if (items.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '该类别下暂无食材名称';
      opt.disabled = true;
      nameSelect.appendChild(opt);
    } else {
      items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.name;
        opt.textContent = item.name;
        nameSelect.appendChild(opt);
      });
    }
  } catch (error) {
    console.error('加载项目失败:', error);
    nameSelect.innerHTML = '<option value="">加载失败</option>';
  }
}

// 根据类别更新项目下拉框
async function updateNameSelectByCategory() {
  const categorySelect = $('i-category');
  
  if (!categorySelect) return;
  
  // 确保i-name是select元素（在函数开始时）
  let nameSelect = $('i-name');
  if (!nameSelect || nameSelect.tagName !== 'SELECT') {
    // 如果不是select，修复它
    const nameLabel = document.querySelector('label:has(#i-name)') || document.querySelector('label[for="i-name"]');
    if (nameLabel) {
      const oldEl = $('i-name');
      if (oldEl) {
        const newSelect = document.createElement('select');
        newSelect.id = 'i-name';
        newSelect.required = true;
        newSelect.innerHTML = '<option value="">请先选择原料分类和类别</option>';
        oldEl.parentNode.replaceChild(newSelect, oldEl);
        nameSelect = $('i-name');
        console.log('在updateNameSelectByCategory开始处修复i-name元素');
      }
    }
  }
  
  if (!nameSelect) return;
  
  const selectedCategory = categorySelect.value.trim();
  
  if (!selectedCategory) {
    if (nameSelect && nameSelect.tagName === 'SELECT') {
      nameSelect.innerHTML = '<option value="">请先选择类别</option>';
    }
    return;
  }
  
  // 包材分类不需要项目字段
  const classificationSelect = $('i-classification');
  const classification = classificationSelect ? classificationSelect.value : '';
  
  if (classification === '包材') {
    // 包材分类不需要项目，隐藏项目字段
    const nameLabel = document.querySelector('label[for="i-name"]') || document.querySelector('label:has(#i-name)');
    const nameContainer = nameLabel ? nameLabel.closest('label') : null;
    if (nameContainer) {
      nameContainer.style.display = 'none';
    }
    if (nameSelect && nameSelect.tagName === 'SELECT') {
      nameSelect.value = '';
      nameSelect.required = false;
    }
    return;
  } else {
    // 非包材分类，显示项目字段
    const nameLabel = document.querySelector('label[for="i-name"]') || document.querySelector('label:has(#i-name)');
    const nameContainer = nameLabel ? nameLabel.closest('label') : null;
    if (nameContainer) {
      nameContainer.style.display = '';
    }
    if (nameSelect && nameSelect.tagName === 'SELECT') {
      nameSelect.required = true;
    }
  }
  
  // 再次确保nameSelect是select元素（在设置innerHTML之前）
  if (!nameSelect || nameSelect.tagName !== 'SELECT') {
    const nameLabel = document.querySelector('label:has(#i-name)') || document.querySelector('label[for="i-name"]');
    if (nameLabel) {
      const oldEl = $('i-name');
      if (oldEl) {
        const newSelect = document.createElement('select');
        newSelect.id = 'i-name';
        newSelect.required = true;
        newSelect.innerHTML = '<option value="">请先选择原料分类和类别</option>';
        oldEl.parentNode.replaceChild(newSelect, oldEl);
        nameSelect = $('i-name');
        console.log('在updateNameSelectByCategory中再次修复i-name元素');
      }
    }
  }
  
  // 尝试从后端加载项目列表
  // 首先需要根据分类名称找到对应的categoryId
  if (classification && backendState.token) {
    try {
      // 加载分类列表，找到对应的categoryId
      const categories = await loadCategoriesFromBackend(classification);
      const category = categories.find(c => c.category === selectedCategory);
      
      if (category && category.id) {
        // 从后端加载项目列表
        await loadItemsForForm(category.id, selectedCategory);
        return;
      }
    } catch (error) {
      console.warn('从后端加载项目失败，使用本地数据:', error);
    }
  }
  
  // 如果后端加载失败，使用本地数据作为后备
  const categoryItems = store.ingredients
    .filter(ing => ing.category === selectedCategory)
    .map(ing => ing.name)
    .filter(Boolean);
  
  const uniqueNames = [...new Set(categoryItems)].sort();
  
  // 确保nameSelect仍然是select元素
  if (!nameSelect || nameSelect.tagName !== 'SELECT') {
    console.error('nameSelect不是select元素，无法设置innerHTML');
    return;
  }
  
  // 清空并重新填充下拉框
  nameSelect.innerHTML = '<option value="">请选择食材名称</option>';
  
  if (uniqueNames.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '该类别下暂无食材名称';
    opt.disabled = true;
    nameSelect.appendChild(opt);
  } else {
    uniqueNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      nameSelect.appendChild(opt);
    });
  }
  
  // 如果类别改变，清空项目选择和编号
  if (selectedCategory) {
    nameSelect.value = '';
    const codeEl = $('i-code');
    if (codeEl) codeEl.value = '';
  }
}

// 自动生成编号（当类别和项目都填写后）
async function autoGenerateCode() {
  const category = $('i-category').value.trim();
  const classification = $('i-classification') ? $('i-classification').value.trim() : '';
  const codeEl = $('i-code');
  const ingredientId = $('ingredient-id').value || null;
  
  console.log('[autoGenerateCode] 类别:', category, '分类:', classification, 'ID:', ingredientId);
  
  // 编辑模式：如果已有编号，不重新生成（保持编号不变，即使类别名称变化）
  if (ingredientId && codeEl && codeEl.value.trim()) {
    console.log('[autoGenerateCode] 编辑模式且已有编号，保持编号不变:', codeEl.value);
    return;
  }
  
  if (!classification || !category) {
    console.log('[autoGenerateCode] 分类或类别为空，无法生成编号');
    if (codeEl) codeEl.value = '';
    return;
  }
  
  if (codeEl) {
    const code = await generateIngredientCode(classification, category, ingredientId);
    console.log('[autoGenerateCode] 生成的编号:', code);
    if (code) {
      codeEl.value = code;
    } else {
      console.warn('[autoGenerateCode] 编号生成失败');
      codeEl.value = '';
    }
  }
}

// 格式化原料详细信息（优化排版，按逻辑分组）
function formatIngredientDetails(ing) {
  // 辅助函数：格式化数字
  const formatNum = (val, decimals = 2) => {
    if (val == null) return '-';
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? '-' : num.toFixed(decimals);
  };
  
  // 构建表格行数据（按逻辑分组）
  const rows = [];
  
  // ========== 基本信息组 ==========
  rows.push({ type: 'section', title: '基本信息' });
  // 第一行：编号、原料分类
  rows.push([
    { label: '编号', value: ing.code || '-' },
    { label: '原料分类', value: ing.classification || '-' }
  ]);
  // 第二行：类别、食材名称（包材不显示食材名称）
  if (ing.classification === '包材') {
    rows.push([
      { label: '类别', value: ing.category || '-', colspan: 2 }
    ]);
  } else {
    rows.push([
      { label: '类别', value: ing.category || '-' },
      { label: '食材名称', value: ing.name || '-' }
    ]);
  }
  
  // ========== 分类特有信息组 ==========
  if (ing.classification === '食材') {
    if (ing.subject || ing.part || ing.originType) {
      rows.push({ type: 'section', title: '食材信息' });
      const subjectValue = ing.subject || '-';
      const partValue = ing.part || '-';
      const originTypeValue = ing.originType || '-';
      rows.push([
        { label: '所属科目', value: subjectValue },
        { label: '部位', value: partValue }
      ]);
      rows.push([
        { label: '产地类型', value: originTypeValue, colspan: 2 }
      ]);
    }
  } else if (ing.classification === '营养补充剂' && (ing.mainNutrient || ing.unitContent || ing.nutrientUnit)) {
    rows.push({ type: 'section', title: '营养补充剂信息' });
    
    // 获取单位值用于显示
    const unitDisplay = ing.unit || '单位';
    const nutrientUnitDisplay = ing.nutrientUnit || '';
    
    // 营养素含量/单位的显示：数值 + 营养素单位（如：500 mg）
    const unitContentValue = ing.unitContent 
      ? `${ing.unitContent}${nutrientUnitDisplay ? ' ' + nutrientUnitDisplay : ''}` 
      : '-';
    
    rows.push([
      { label: '主要营养素', value: ing.mainNutrient || '-' },
      { label: `营养素含量/${unitDisplay}`, value: unitContentValue }
    ]);
  }
  
  // ========== 产品信息组 ==========
  rows.push({ type: 'section', title: '产品信息' });
  rows.push([
    { label: '品牌', value: ing.brand || '-' },
    { label: '型号', value: ing.model || '-' }
  ]);
  
  // ========== 采购信息组 ==========
  rows.push({ type: 'section', title: '采购信息' });
  
  if (ing.classification === '营养补充剂') {
    // 营养补充剂：不显示单位字段，添加采购日期字段
    rows.push([
      { label: '采购渠道', value: ing.source || '-' },
      { label: '采购日期', value: '' } // 暂时留空，待后续完善采购系统
    ]);
    
    const cost = ing.cost != null ? formatNum(ing.cost, 2) : '-';
    const quantity = ing.quantity != null ? `${formatNum(ing.quantity, 1)} ${ing.unit || ''}` : '-';
    rows.push([
      { label: '费用（采购价格）', value: cost },
      { label: '单量（采购数量）', value: quantity }
    ]);
    
    // 价格/100营养素单位：移动到采购信息中，营养素单位替换为实际值
    const nutrientUnitDisplay = ing.nutrientUnit || '营养素单位';
    const pricePer100NutrientUnit = ing.pricePer100NutrientUnit != null 
      ? formatNum(ing.pricePer100NutrientUnit, 4) 
      : '-';
    rows.push([
      { label: `价格/100${nutrientUnitDisplay}`, value: pricePer100NutrientUnit, colspan: 2 }
    ]);
  } else {
    // 食材和包材：显示单位字段，不显示采购日期
    rows.push([
      { label: '采购渠道', value: ing.source || '-' },
      { label: '单位', value: ing.unit || '-' }
    ]);
    
    const cost = ing.cost != null ? formatNum(ing.cost, 2) : '-';
    const quantity = ing.quantity != null ? `${formatNum(ing.quantity, 1)} ${ing.unit || ''}` : '-';
    rows.push([
      { label: '费用（采购价格）', value: cost },
      { label: '单量（采购数量）', value: quantity }
    ]);
  }
  
  // ========== 价格信息组 ==========
  // 营养补充剂不显示价格信息（价格/100营养素单位已在"营养补充剂信息"组中显示）
  if (ing.classification !== '营养补充剂') {
    rows.push({ type: 'section', title: '价格信息' });
    
    if (ing.classification === '包材') {
      // 包材：显示价格/单位
      const costValue = ing.cost || 0;
      const quantityValue = ing.quantity || 0;
      const unit = ing.unit || '-';
      const unitDisplay = unit !== '-' ? unit : '-';
      const pricePerUnit = quantityValue > 0 ? formatNum(costValue / quantityValue, 4) : '-';
      
      rows.push([
        { label: `价格/${unitDisplay}`, value: pricePerUnit, colspan: 2 }
      ]);
      
      const weightPerUnit = ing.weightPerUnit != null ? `${formatNum(ing.weightPerUnit, 2)} g` : '-';
      rows.push([
        { label: `重量（g）/${unitDisplay}`, value: weightPerUnit, colspan: 2 }
      ]);
    } else {
      // 食材：显示单价/500单位和可食部单价/500单位
      const pricePer500 = ing.pricePer500 != null ? formatNum(ing.pricePer500, 4) : '-';
      const ediblePortion = ing.ediblePortion != null 
        ? (Math.round(ing.ediblePortion * 100) !== 100 ? `${Math.round(ing.ediblePortion * 100)}%` : '100%')
        : '-';
      rows.push([
        { label: '单价/500单位', value: pricePer500 },
        { label: '可食部', value: ediblePortion }
      ]);
      
      const ediblePricePer500 = ing.ediblePricePer500 != null ? formatNum(ing.ediblePricePer500, 4) : '-';
      rows.push([
        { label: '可食部单价/500单位', value: ediblePricePer500, colspan: 2 }
      ]);
    }
  }
  
  // ========== 其他信息组 ==========
  if (ing.description || ing.mainFunction) {
    rows.push({ type: 'section', title: '其他信息' });
    if (ing.classification !== '包材') {
      rows.push([
        { label: '说明', value: ing.description || '-' },
        { label: '主要营养价值', value: ing.mainFunction || '-' }
      ]);
    } else {
      rows.push([
        { label: '说明', value: ing.description || '-', colspan: 2 }
      ]);
    }
  }
  
  // 生成表格HTML
  const tableRows = [];
  rows.forEach(row => {
    if (row.type === 'section') {
      tableRows.push(`<tr>
        <td colspan="2" style="padding:8px 12px; background:var(--bg-secondary, #f5f5f5); border:1px solid var(--border); font-weight:600; font-size:13px; color:var(--text-primary, #333);">
          ${row.title}
        </td>
      </tr>`);
    } else {
      const cells = row.map(cell => {
        const colspan = cell.colspan ? ` colspan="${cell.colspan}"` : '';
        const width = cell.colspan === 2 ? 'width:100%;' : 'width:50%;';
        return `<td style="padding:6px 12px; border:1px solid var(--border); ${width}; font-size:13px;">
          <span style="font-weight:500; color:var(--text-secondary, #666);">${cell.label}：</span>
          <span style="color:var(--text-primary, #333);">${cell.value}</span>
        </td>`;
      }).join('');
      tableRows.push(`<tr>${cells}</tr>`);
    }
  });
  
  return `<div class="item-details" style="margin-top:12px;">
    <table style="width:100%; border-collapse:collapse; font-size:13px; table-layout:fixed; border:1px solid var(--border); border-radius:4px; overflow:hidden;">
      ${tableRows.join('')}
    </table>
  </div>`;
}

function renderIngredientsList() {
  const list = $('ingredients-list');
  if (!list) return;
  
  // 在清空列表前，确保表单元素不在列表内部
  const formCard = $('ingredient-form-card');
  if (formCard && list.contains(formCard)) {
    console.warn('[renderIngredientsList] Form card is inside list, moving it out');
      const viewInventory = $('view-inventory');
      const actionsDiv = document.querySelector('#view-inventory .actions');
      const ingredientsHead = $('ingredients-head');
      if (viewInventory && actionsDiv && ingredientsHead && ingredientsHead.parentNode) {
        formCard.parentNode?.removeChild(formCard);
        // 插入到actions之后、ingredients-head之前
        ingredientsHead.parentNode.insertBefore(formCard, ingredientsHead);
      }
  }
  
  const { pageItems, total, totalPages } = paginatedIngredients();
  
  // 注意：筛选下拉框在 loadIngredientsFromBackend 中更新，这里不需要重复更新
  
  if (pageItems.length === 0) {
    list.innerHTML = '<div class="muted" style="text-align:center; padding:20px">暂无原料数据</div>';
    const totalEl = $('ingredients-total');
    if (totalEl) totalEl.textContent = '共 0 条';
    const pageInfoEl = $('ingredients-pageinfo');
    if (pageInfoEl) pageInfoEl.textContent = '';
    const prevBtn = $('ingredients-prev');
    if (prevBtn) prevBtn.disabled = true;
    const nextBtn = $('ingredients-next');
    if (nextBtn) nextBtn.disabled = true;
    return;
  }
  
  list.innerHTML = pageItems.map(ing => {
    const description = escapeHtml(ing.description || '');
    return `
      <div class="list-item" data-id="${ing.id}">
        <div class="list-item-row" style="grid-template-columns: 1fr 1.2fr 1fr 1fr 1fr minmax(0, 2fr);">
          <div>${ing.category || '-'}</div>
          <div>${ing.classification === '包材' ? '-' : (ing.name || '-')}</div>
          <div>${ing.brand || '-'}</div>
          <div>${ing.source || '-'}</div>
          <div>${ing.model || '-'}</div>
          <div style="font-size:13px; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;" title="${description}">${description}</div>
        </div>
        <div class="item-actions">
          <button class="btn small" data-detail="${ing.id}">详细信息</button>
          <button class="btn small" data-edit="${ing.id}">编辑</button>
          <button class="btn small" data-del="${ing.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  // 绑定详细信息按钮
  list.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.detail;
      const wrap = list.querySelector(`.list-item[data-id="${id}"]`);
      if (!wrap) return;
      
      const existing = wrap.querySelector('.item-details');
      if (existing) {
        existing.remove();
        return;
      }
      
      // 显示加载提示
      const loadingEl = document.createElement('div');
      loadingEl.className = 'item-details';
      loadingEl.style.cssText = 'padding:12px; text-align:center; color:var(--text-secondary);';
      loadingEl.textContent = '正在加载详细信息...';
      wrap.insertAdjacentElement('beforeend', loadingEl);
      
      // 使用统一的 getIngredientById 函数（支持按需查询和缓存）
      const ing = await getIngredientById(id);
      
      // 移除加载提示
      loadingEl.remove();
      
      if (!ing) {
        const errorEl = document.createElement('div');
        errorEl.className = 'item-details';
        errorEl.style.cssText = 'padding:12px; text-align:center; color:var(--error-color, #d32f2f);';
        errorEl.textContent = '无法加载详细信息，请刷新后重试';
        wrap.insertAdjacentElement('beforeend', errorEl);
        return;
      }
      
      wrap.insertAdjacentHTML('beforeend', formatIngredientDetails(ing));
    });
  });
  
  // 绑定编辑按钮（使用事件委托，避免重复绑定）
  // 注意：每次renderIngredientsList都会重新绑定，需要先移除旧的监听器
  const existingHandler = list._editButtonHandler;
  if (existingHandler) {
    list.removeEventListener('click', existingHandler);
  }
  
  const editButtonHandler = (e) => {
    const btn = e.target.closest('[data-edit]');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const id = btn.dataset.edit;
    console.log('Edit button clicked, id:', id);
    // 找到被编辑的原料行
    // 先找到按钮的父元素（item-actions），然后找到它的父元素（list-item）
    const itemActions = btn.closest('.item-actions');
    const listItem = itemActions ? itemActions.parentElement : btn.closest('.list-item');
    
    if (listItem && listItem.dataset.id === id) {
      // 将表单插入到该行下方
      openIngredientForm(id, listItem).catch(err => {
        console.error('Error opening ingredient form:', err);
      });
    } else {
      // 如果找不到行，使用默认位置
      openIngredientForm(id).catch(err => {
        console.error('Error opening ingredient form:', err);
      });
    }
  };
  
  list._editButtonHandler = editButtonHandler;
  list.addEventListener('click', editButtonHandler);
  
  // 绑定删除按钮
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteIngredient(btn.dataset.del));
  });
  
  const totalEl = $('ingredients-total');
  if (totalEl) totalEl.textContent = `共 ${total} 条`;
  const pageInfoEl = $('ingredients-pageinfo');
  if (pageInfoEl) pageInfoEl.textContent = `第 ${store.ingredientPage}/${totalPages} 页`;
  const prevBtn = $('ingredients-prev');
  if (prevBtn) prevBtn.disabled = store.ingredientPage <= 1;
  const nextBtn = $('ingredients-next');
  if (nextBtn) nextBtn.disabled = store.ingredientPage >= totalPages;
}

function paginatedIngredients() {
  // 如果使用后端数据，直接返回当前页数据（后端已处理分页和搜索）
  if (backendState.token && store.totalIngredients !== undefined) {
    return {
      pageItems: store.ingredients,
      total: store.totalIngredients || store.ingredients.length,
      totalPages: store.ingredientTotalPages || 1
    };
  }
  
  // 本地数据：客户端分页和搜索（仅用于未登录时的降级方案）
  const searchEl = $('ingredient-search');
  const categoryFilterEl = $('ingredient-category-filter');
  const nameFilterEl = $('ingredient-name-filter');
  
  const searchQ = (searchEl?.value || '').trim().toLowerCase();
  const categoryFilter = (categoryFilterEl?.value || '').trim();
  const nameFilter = (nameFilterEl?.value || '').trim();
  
  const filtered = store.ingredients.filter(ing => {
    if (searchQ) {
      const searchLower = searchQ.toLowerCase();
      // 将所有文本字段合并为一个字符串进行搜索
      // 确保所有字段都被转换为字符串，null/undefined转换为空字符串
      const searchableText = [
        String(ing.code || ''),
        String(ing.name || ''),
        String(ing.brand || ''),
        String(ing.category || ''),
        String(ing.classification || ''),
        String(ing.source || ''),
        String(ing.model || ''),
        String(ing.description || ''),
        String(ing.mainFunction || ''),
        String(ing.subject || ''),
        String(ing.part || ''),
        String(ing.originType || ''),
        String(ing.mainNutrient || ''),
        String(ing.nutrientUnit || ''),
        String(ing.unit || '')
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }
    
    const matchCategory = !categoryFilter || ing.category === categoryFilter;
    const matchName = !nameFilter || ing.name === nameFilter;
    
    return matchCategory && matchName;
  });
  
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / store.ingredientPageSize));
  if (store.ingredientPage > totalPages) store.ingredientPage = totalPages;
  
  const start = (store.ingredientPage - 1) * store.ingredientPageSize;
  const pageItems = filtered.slice(start, start + store.ingredientPageSize);
  
  return { pageItems, total, totalPages };
}

// 加载指定分类和类别下的项目列表（用于下拉框）
async function loadItemsForForm(classification, category, checkCancelled = null, signal = null, providedCategories = null) {
  if (!backendState.token) {
    return;
  }
  
  try {
    // 检查是否被取消
    if (signal?.aborted || (checkCancelled && checkCancelled())) {
      return;
    }
    
    // 如果提供了类别数据，直接使用，避免重复请求
    let categories = providedCategories;
    if (!categories) {
      // 检查内存缓存
      const cached = categoriesCache.get(classification);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        categories = cached.data;
      } else {
        // 从后端加载
        categories = await loadCategoriesFromBackend(classification);
        // 更新缓存
        categoriesCache.set(classification, {
          data: categories,
          timestamp: Date.now()
        });
      }
    }
    
    // 检查是否被取消
    if (signal?.aborted || (checkCancelled && checkCancelled())) {
      return;
    }
    
    // 确保categories是数组
    if (!Array.isArray(categories)) {
      console.error('categories不是数组:', categories);
      const nameSelect = $('i-name');
      if (nameSelect && (!checkCancelled || !checkCancelled())) {
        nameSelect.innerHTML = '<option value="">加载分类失败</option>';
      }
      return;
    }
    
    const targetCategory = categories.find(cat => cat.category === category);
    if (!targetCategory) {
      const nameSelect = $('i-name');
      if (nameSelect && (!checkCancelled || !checkCancelled())) {
        nameSelect.innerHTML = '<option value="">未找到该类别</option>';
      }
      return;
    }
    
    // 检查是否被取消
    if (signal?.aborted || (checkCancelled && checkCancelled())) {
      return;
    }
    
    // 加载该类别的项目
    const response = await backendRequest(`/api/v1/ingredient-items?categoryId=${targetCategory.id}&pageSize=10000`, {
      method: 'GET'
    });
    
    // 检查是否被取消
    if (signal?.aborted || (checkCancelled && checkCancelled())) {
      return;
    }
    
    const data = response?.data || response;
    const items = Array.isArray(data) ? data : (data.items || []);
    
    // 检查是否被取消
    if (signal?.aborted || (checkCancelled && checkCancelled())) {
      return;
    }
    
    // 填充下拉框
    const nameSelect = $('i-name');
    if (nameSelect && (!checkCancelled || !checkCancelled())) {
      nameSelect.innerHTML = '<option value="">请选择食材名称</option>';
      items.forEach(item => {
        // 在循环中也检查是否被取消
        if (checkCancelled && checkCancelled()) {
          return;
        }
        const opt = document.createElement('option');
        opt.value = item.name;
        opt.textContent = item.name;
        opt.dataset.itemId = item.id;
        nameSelect.appendChild(opt);
      });
    }
    
    // 监听下拉框变化，设置itemId（只在未取消时添加）
    if (nameSelect && (!checkCancelled || !checkCancelled())) {
      nameSelect.addEventListener('change', () => {
        if (checkCancelled && checkCancelled()) {
          return;
        }
        const selectedOption = nameSelect.options[nameSelect.selectedIndex];
        const itemIdInput = $('i-name-item-id');
        if (itemIdInput && selectedOption && selectedOption.dataset && selectedOption.dataset.itemId) {
          itemIdInput.value = selectedOption.dataset.itemId;
        }
      }, { once: false });
    }
  } catch (error) {
    // 如果操作已被取消，不显示错误
    if (!checkCancelled || !checkCancelled()) {
      console.error('加载项目列表失败:', error);
      const nameSelect = $('i-name');
      if (nameSelect) {
        nameSelect.innerHTML = '<option value="">加载失败</option>';
      }
    }
  }
}

// 搜索所有原料（用于第一行的搜索栏）
async function searchIngredientForForm(query) {
  if (!query || query.trim().length === 0) {
    const dropdown = $('i-ingredient-search-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    return;
  }
  
  const searchText = query.trim().toLowerCase();
  const dropdown = $('i-ingredient-search-dropdown');
  if (!dropdown) return;
  
  // 显示加载状态
  dropdown.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-secondary);">搜索中...</div>';
  dropdown.style.display = 'block';
  
  try {
    let allIngredients = [];
    
    // 如果已登录，从后端API加载所有原料
    if (backendState.token) {
      try {
        // 加载所有原料（不分页）
        const response = await backendRequest('/api/v1/ingredients?pageSize=10000', {
          method: 'GET'
        });
        
        const data = response?.data || response;
        const items = data.items || data || [];
        
        // 转换为前端格式（包含所有字段，与loadIngredientsFromBackend保持一致）
        allIngredients = items.map(ing => {
          const sourceValue = (ing.source !== null && ing.source !== undefined && ing.source !== '') 
            ? String(ing.source).trim() 
            : '';
          
          return {
            id: `ing_${ing.id}`,
            _backendId: ing.id,
            code: ing.code || '',
            name: ing.name || '',
            brand: ing.brand || '',
            source: sourceValue,
            category: ing.category || '',
            classification: ing.classification || '',
            unit: ing.unit || 'g',
            cost: ing.cost || 0,
            quantity: ing.quantity || 0,
            pricePer500: ing.pricePer500 || 0,
            ediblePercent: ing.ediblePercent || 100,
            ediblePricePer500: ing.ediblePricePer500 || 0,
            weightPerUnit: ing.weightPerUnit || 0,
            description: ing.description || '',
            mainFunction: ing.mainFunction || '',
            // 新增字段
            subject: ing.subject || null,
            part: ing.part || null,
            originType: ing.originType || null,
            model: ing.model || null,
            mainNutrient: (ing.mainNutrient !== null && ing.mainNutrient !== undefined && ing.mainNutrient !== '') ? ing.mainNutrient : null,
            nutrientUnit: (ing.nutrientUnit !== null && ing.nutrientUnit !== undefined && ing.nutrientUnit !== '') ? ing.nutrientUnit : null
          };
        });
      } catch (error) {
        console.error('[searchIngredientForForm] Failed to load ingredients from backend:', error);
        // 如果后端加载失败，回退到使用store.ingredients
        allIngredients = store.ingredients || [];
      }
    } else {
      // 未登录，使用store.ingredients
      allIngredients = store.ingredients || [];
    }
    
    // 搜索匹配的原料（全字段搜索）
    console.log('[searchIngredientForForm] Searching for:', searchText, 'in', allIngredients.length, 'ingredients');
    
    // 调试：检查第一个原料的字段
    if (allIngredients.length > 0) {
      const firstIng = allIngredients[0];
      console.log('[searchIngredientForForm] Sample ingredient fields:', {
        code: firstIng.code,
        name: firstIng.name,
        category: firstIng.category,
        model: firstIng.model,
        classification: firstIng.classification,
        hasModel: 'model' in firstIng,
        hasCategory: 'category' in firstIng
      });
    }
    
    const matched = allIngredients.filter(ing => {
      const searchLower = searchText.toLowerCase();
      // 将所有文本字段合并为一个字符串进行搜索
      // 确保所有字段都被转换为字符串，null/undefined转换为空字符串
      const searchableText = [
        String(ing.code || ''),
        String(ing.name || ''),
        String(ing.brand || ''),
        String(ing.category || ''),
        String(ing.classification || ''),
        String(ing.source || ''),
        String(ing.model || ''),
        String(ing.description || ''),
        String(ing.mainFunction || ''),
        String(ing.subject || ''),
        String(ing.part || ''),
        String(ing.originType || ''),
        String(ing.mainNutrient || ''),
        String(ing.nutrientUnit || ''),
        String(ing.unit || '')
      ].join(' ').toLowerCase();
      
      const matches = searchableText.includes(searchLower);
      
      // 调试：如果搜索"泡沫箱"，输出匹配信息
      if (searchText.includes('泡沫') || searchText.includes('箱')) {
        console.log('[searchIngredientForForm] Checking ingredient:', {
          name: ing.name,
          category: ing.category,
          model: ing.model,
          classification: ing.classification,
          searchableText: searchableText.substring(0, 100),
          matches: matches
        });
      }
      
      return matches;
    }).slice(0, 20); // 最多显示20个结果
    
    console.log('[searchIngredientForForm] Found', matched.length, 'matches');
    if (matched.length > 0) {
      console.log('[searchIngredientForForm] First few matches:', matched.slice(0, 3).map(m => m.name));
    }
    
    if (matched.length === 0) {
      dropdown.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-secondary);">未找到匹配的原料</div>';
      dropdown.style.display = 'block';
      return;
    }
    
    // 渲染搜索结果
    dropdown.innerHTML = matched.map(ing => {
      const name = ing.name || '-';
      const brand = ing.brand || '-';
      const category = ing.category || '-';
      const classification = ing.classification || '-';
      return `
        <div class="ingredient-search-item" data-ingredient-id="${ing.id}" data-name="${escapeHtml(name)}" data-brand="${escapeHtml(brand)}" data-category="${escapeHtml(category)}" data-classification="${escapeHtml(classification)}" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border);">
          <div style="font-weight:500;">${escapeHtml(name)}</div>
          <div style="font-size:12px; color:var(--text-secondary);">${escapeHtml(classification)} - ${escapeHtml(category)} - ${escapeHtml(brand)}</div>
        </div>
      `;
    }).join('');
    
    dropdown.style.display = 'block';
    
    // 绑定点击事件
    dropdown.querySelectorAll('.ingredient-search-item').forEach(item => {
      item.addEventListener('click', () => {
        const ingredientId = item.dataset.ingredientId;
        const name = item.dataset.name;
        const category = item.dataset.category;
        const classification = item.dataset.classification;
        
        selectIngredientForForm(ingredientId, name, category, classification);
      });
      
      // 鼠标悬停效果
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'var(--bg-secondary)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });
    });
  } catch (error) {
    console.error('[searchIngredientForForm] Error:', error);
    dropdown.innerHTML = '<div style="padding:10px; text-align:center; color:var(--error);">搜索失败，请重试</div>';
    dropdown.style.display = 'block';
  }
}

// 选择原料后自动匹配
async function selectIngredientForForm(ingredientId, name, category, classification) {
  const searchInput = $('i-ingredient-search');
  const dropdown = $('i-ingredient-search-dropdown');
  const classificationSelect = $('i-classification');
  const categorySelect = $('i-category');
  const nameSelect = $('i-name');
  
  if (searchInput) searchInput.value = name;
  if (dropdown) dropdown.style.display = 'none';
  
  // 自动匹配分类和类别
  if (classificationSelect && classification) {
    classificationSelect.value = classification;
    // 更新字段显示/隐藏
    updateIngredientFieldsVisibility(classification);
    
    // 新增模式：如果选择了分类，显示详细信息区域
    const detailsSection = $('ingredient-details-section');
    const card = $('ingredient-form-card');
    const currentId = $('ingredient-id')?.value;
    const isEditMode = (card && card.hasAttribute('data-editing')) || (currentId && currentId.trim() !== '');
    
    console.log('[selectIngredientForForm] classification:', classification, 'isEditMode:', isEditMode, 'detailsSection exists:', !!detailsSection);
    
    // 使用统一的状态管理器更新显示/隐藏（单一入口）
    if (classification && !isEditMode) {
      console.log('[selectIngredientForForm] Updating details section state for classification:', classification);
      detailsSectionState.updateState({
        classification: classification,
        isEditMode: false
      });
    }
    
    // 延迟触发 change 事件，确保 detailsSection 先显示
    setTimeout(() => {
      classificationSelect.dispatchEvent(new Event('change'));
    }, 50);
  }
  
  // 等待分类加载完成后再设置类别
  if (categorySelect && category && classification !== '包材') {
    // 先尝试加载类别列表
    if (classification) {
      await loadCategoriesForForm(classification);
    }
    // 设置类别值
    categorySelect.value = category;
    // 触发change事件以加载项目列表
    categorySelect.dispatchEvent(new Event('change'));
    
    // 等待项目列表加载完成后设置食材名称
    setTimeout(async () => {
      if (nameSelect && nameSelect.tagName === 'SELECT' && nameSelect.options && name) {
        try {
          await loadItemsForForm(classification, category, null);
          // 等待选项加载
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // 重新获取元素
          const nameSelectAfter = $('i-name');
          if (nameSelectAfter && nameSelectAfter.tagName === 'SELECT' && nameSelectAfter.options) {
            nameSelectAfter.value = name;
            // 设置itemId（确保options存在且可迭代）
            if (nameSelectAfter.options && nameSelectAfter.options.length > 0) {
              try {
                const optionsArray = Array.from(nameSelectAfter.options);
                const selectedOption = optionsArray.find(opt => opt.value === name);
                if (selectedOption && selectedOption.dataset && selectedOption.dataset.itemId) {
                  const itemIdInput = $('i-name-item-id');
                  if (itemIdInput) {
                    itemIdInput.value = selectedOption.dataset.itemId;
                  }
                }
              } catch (err) {
                console.warn('设置itemId失败:', err);
              }
            }
          }
        } catch (err) {
          console.error('加载项目列表失败:', err);
        }
      }
    }, 200);
  }
  
  // 如果是包材，不需要设置食材名称
  if (classification === '包材') {
    if (nameSelect) {
      nameSelect.innerHTML = '<option value="">包材无需选择食材名称</option>';
    }
  }
}

// 加载所有食材项目（用于搜索）
let allIngredientItemsCache = null;
async function loadAllIngredientItems() {
  if (allIngredientItemsCache) {
    return allIngredientItemsCache;
  }
  
  if (!backendState.token) {
    return [];
  }
  
  try {
    const response = await backendRequest('/api/v1/ingredient-items?pageSize=10000', {
      method: 'GET'
    });
    
    const data = response?.data || response;
    const items = Array.isArray(data) ? data : (data.items || []);
    
    // 为每个项目添加分类和类别信息
    if (items.length > 0 && items[0].categoryId) {
      // 加载所有分类以便匹配
      const allCategories = [];
      for (const classification of ['食材', '营养补充剂', '包材']) {
        const cats = await loadCategoriesFromBackend(classification);
        allCategories.push(...cats);
      }
      
      const categoryMap = {};
      allCategories.forEach(cat => {
        categoryMap[cat.id] = cat;
      });
      
      // 为每个项目添加分类和类别信息
      items.forEach(item => {
        const category = categoryMap[item.categoryId];
        if (category) {
          item.classification = category.classification;
          item.category = category.category;
        }
      });
    }
    
    allIngredientItemsCache = items;
    return items;
  } catch (error) {
    console.error('加载食材项目失败:', error);
    return [];
  }
}

// 搜索食材名称
let searchTimeout = null;
async function searchIngredientName(query) {
  if (!query || query.trim().length === 0) {
    const dropdown = $('i-name-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    return;
  }
  
  const searchText = query.trim().toLowerCase();
  const items = await loadAllIngredientItems();
  
  // 过滤匹配的项目
  const matched = items.filter(item => 
    item.name && item.name.toLowerCase().includes(searchText)
  ).slice(0, 20); // 最多显示20个结果
  
  const dropdown = $('i-name-dropdown');
  if (!dropdown) return;
  
  if (matched.length === 0) {
    dropdown.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-secondary);">未找到匹配的食材</div>';
    dropdown.style.display = 'block';
    return;
  }
  
  // 渲染搜索结果
  dropdown.innerHTML = matched.map(item => {
    const categoryName = item.category || '未知类别';
    const classificationName = item.classification || '未知分类';
    return `
      <div class="ingredient-search-item" data-item-id="${item.id}" data-name="${escapeHtml(item.name)}" data-category-id="${item.categoryId}" data-category="${escapeHtml(categoryName)}" data-classification="${escapeHtml(classificationName)}" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border);">
        <div style="font-weight:500;">${escapeHtml(item.name)}</div>
        <div style="font-size:12px; color:var(--text-secondary);">${escapeHtml(classificationName)} - ${escapeHtml(categoryName)}</div>
      </div>
    `;
  }).join('');
  
  dropdown.style.display = 'block';
  
  // 绑定点击事件
  dropdown.querySelectorAll('.ingredient-search-item').forEach(item => {
    item.addEventListener('click', () => {
      const itemId = item.dataset.itemId;
      const name = item.dataset.name;
      const categoryId = item.dataset.categoryId;
      const category = item.dataset.category;
      const classification = item.dataset.classification;
      
      selectIngredientItem(itemId, name, categoryId, category, classification);
    });
    
    // 鼠标悬停效果
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'var(--bg-secondary)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'white';
    });
  });
}

// 选择食材项目
async function selectIngredientItem(itemId, name, categoryId, category, classification) {
  const searchInput = $('i-name-search');
  const hiddenName = $('i-name');
  const hiddenItemId = $('i-name-item-id');
  const dropdown = $('i-name-dropdown');
  const classificationSelect = $('i-classification');
  const categorySelect = $('i-category');
  
  if (searchInput) searchInput.value = name;
  if (hiddenName) hiddenName.value = name;
  if (hiddenItemId) hiddenItemId.value = itemId;
  if (dropdown) dropdown.style.display = 'none';
  
  // 自动匹配分类和类别
  if (classificationSelect && classification) {
    classificationSelect.value = classification;
    // 更新字段显示/隐藏
    updateIngredientFieldsVisibility(classification);
    classificationSelect.dispatchEvent(new Event('change'));
  }
  
  // 等待分类加载完成后再设置类别
  if (categorySelect && category) {
    // 先尝试加载类别列表
    if (classification) {
      await loadCategoriesForForm(classification);
    }
    // 设置类别值
    categorySelect.value = category;
    // 触发change事件以触发编号生成
    categorySelect.dispatchEvent(new Event('change'));
  }
  
  // 显示详细信息区域（使用统一的状态管理器）
  detailsSectionState.init();
  detailsSectionState.updateState({
    classification: classification || '',
    isEditMode: false
  });
  
  // 自动生成编号（延迟一点确保所有值都已设置）
  setTimeout(() => {
    autoGenerateCode();
  }, 200);
}

// ============================================
// 原料表单状态管理器（状态机模式）
// ============================================
const FormState = {
  CLOSED: 'closed',
  NEW: 'new',
  EDIT: 'edit',
  LOADING: 'loading'
};

class IngredientFormStateManager {
  constructor() {
    this.state = FormState.CLOSED;
    this.currentId = null;
    this.abortController = null;
    this.observers = [];
    this.intervals = [];
  }

  // 切换到新状态
  transition(newState, id = null) {
    // 清理之前的状态
    this.cleanup();
    
    // 设置新状态
    this.state = newState;
    this.currentId = id;
    
    // 创建新的 AbortController
    if (newState !== FormState.CLOSED) {
      this.abortController = new AbortController();
    }
    
    console.log(`[FormState] Transitioned to: ${newState}`, id ? `(id: ${id})` : '');
  }

  // 检查操作是否已取消
  isAborted() {
    return this.abortController?.aborted || false;
  }

  // 检查当前状态
  isState(state) {
    return this.state === state;
  }

  // 检查是否是编辑模式
  isEditMode() {
    return this.state === FormState.EDIT && this.currentId !== null;
  }

  // 检查是否是新增模式
  isNewMode() {
    return this.state === FormState.NEW;
  }

  // 注册需要清理的资源
  registerObserver(observer) {
    this.observers.push(observer);
  }

  registerInterval(interval) {
    this.intervals.push(interval);
  }

  // 清理所有资源
  cleanup() {
    // 取消所有异步操作
    if (this.abortController && !this.abortController.aborted) {
      this.abortController.abort();
    }

    // 清理所有 observers
    this.observers.forEach(obs => {
      if (obs && typeof obs.disconnect === 'function') {
        obs.disconnect();
      }
    });
    this.observers = [];

    // 清理所有 intervals
    this.intervals.forEach(interval => {
      if (interval) {
        clearInterval(interval);
      }
    });
    this.intervals = [];

    // 重置状态
    if (this.state !== FormState.CLOSED) {
      this.state = FormState.CLOSED;
      this.currentId = null;
    }
  }

  // 关闭表单
  close() {
    this.transition(FormState.CLOSED);
  }
}

// 创建全局状态管理器实例
const ingredientFormState = new IngredientFormStateManager();

// ============================================
// 详细信息区域状态管理器（统一管理显示/隐藏）
// ============================================
class DetailsSectionStateManager {
  constructor() {
    this.isVisible = false;
    this.classification = '';
    this.isEditMode = false;
    this.detailsSection = null;
  }
  
  // 初始化（获取DOM元素）
  init() {
    this.detailsSection = document.getElementById('ingredient-details-section');
    if (!this.detailsSection) {
      console.warn('[DetailsSectionState] Element not found');
    }
  }
  
  // 更新状态（单一入口，所有显示/隐藏逻辑都通过这里）
  updateState({ classification = '', isEditMode = false }) {
    this.classification = classification || '';
    this.isEditMode = isEditMode || false;
    
    // 判断是否应该显示（单一逻辑）
    const shouldBeVisible = this.shouldBeVisible();
    
    // 如果状态没有变化，不执行操作
    if (shouldBeVisible === this.isVisible && this.detailsSection) {
      return;
    }
    
    this.isVisible = shouldBeVisible;
    this.applyState();
    
    console.log('[DetailsSectionState] Updated:', {
      classification: this.classification,
      isEditMode: this.isEditMode,
      isVisible: this.isVisible
    });
  }
  
  // 判断是否应该显示（单一逻辑）
  shouldBeVisible() {
    // 编辑模式：始终显示
    if (this.isEditMode) {
      return true;
    }
    // 新增模式：有分类就显示
    return this.classification.trim() !== '';
  }
  
  // 应用状态到DOM（单一操作）
  applyState() {
    if (!this.detailsSection) {
      this.init();
      if (!this.detailsSection) {
        console.warn('[DetailsSectionState] Cannot apply state, element not found');
        return;
      }
    }
    
    if (this.isVisible) {
      // 先移除所有可能的内联样式
      this.detailsSection.style.removeProperty('display');
      this.detailsSection.style.removeProperty('visibility');
      this.detailsSection.style.removeProperty('height');
      this.detailsSection.style.removeProperty('overflow');
      
      // 移除隐藏类，添加显示类
      this.detailsSection.classList.remove('ingredient-details-hidden');
      this.detailsSection.classList.add('ingredient-details-visible');
      
      // 确保 grid 也显示
      const grid = this.detailsSection.querySelector('.grid');
      if (grid) {
        grid.style.removeProperty('display');
      }
      
      // 验证：如果计算后的样式仍然是 none，强制设置（可能父元素隐藏导致）
      // 使用双重 requestAnimationFrame 确保在DOM完全渲染后检查
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const computedDisplay = window.getComputedStyle(this.detailsSection).display;
          // 检查父元素是否可见
          const parent = this.detailsSection.parentElement;
          const parentDisplay = parent ? window.getComputedStyle(parent).display : 'block';
          
          // 只有在父元素可见但子元素仍然隐藏时才警告和强制设置
          if (computedDisplay === 'none' && parentDisplay !== 'none') {
            console.warn('[DetailsSectionState] Computed display is still none after class application, forcing block');
            this.detailsSection.style.setProperty('display', 'block', 'important');
            // 同时确保 grid 也显示
            if (grid) {
              grid.style.setProperty('display', 'grid', 'important');
            }
          }
        });
      });
    } else {
      // 隐藏时，移除显示类，添加隐藏类
      this.detailsSection.classList.remove('ingredient-details-visible');
      this.detailsSection.classList.add('ingredient-details-hidden');
    }
  }
  
  // 强制刷新（用于确保状态同步）
  refresh() {
    if (!this.detailsSection) {
      this.init();
    }
    this.applyState();
  }
}

// 创建全局详细信息区域状态管理器实例
const detailsSectionState = new DetailsSectionStateManager();

// ============================================
// 辅助函数：安全执行DOM操作
// ============================================
function safeDOMOperation(element, operation, description = '') {
  if (!element || !document.contains(element)) {
    console.warn(`[SafeDOM] Element not valid for operation: ${description}`);
    return false;
  }
  
  if (ingredientFormState.isAborted()) {
    console.log(`[SafeDOM] Operation aborted: ${description}`);
    return false;
  }
  
  try {
    operation();
    return true;
  } catch (error) {
    console.error(`[SafeDOM] Operation failed: ${description}`, error);
    return false;
  }
}

// ============================================
// 辅助函数：设置表单位置
// ============================================
function setFormPosition(card, id, insertAfterElement) {
  if (!card) {
    console.warn('[setFormPosition] Card element not found');
    return;
  }
  
  // 确保card在DOM中
  if (!document.contains(card)) {
    console.warn('[setFormPosition] Card not in DOM, restoring to default position');
    const actionsDiv = document.querySelector('#view-inventory .actions');
    const ingredientsHead = $('ingredients-head');
    if (actionsDiv && ingredientsHead && ingredientsHead.parentNode) {
      // 插入到actions之后、ingredients-head之前
      ingredientsHead.parentNode.insertBefore(card, ingredientsHead);
    } else {
      console.error('[setFormPosition] Cannot restore card, required parent elements not found');
      return;
    }
  }
  
  if (insertAfterElement && id) {
    // 编辑模式：插入到指定元素之后
    // 确保insertAfterElement在DOM中
    if (!document.contains(insertAfterElement)) {
      console.warn('[setFormPosition] insertAfterElement not in DOM, using default position');
      insertAfterElement = null;
    } else {
      try {
        // 如果card已经在正确位置，不需要移动
        if (card.previousSibling === insertAfterElement || 
            (card.parentNode === insertAfterElement.parentNode && 
             insertAfterElement.nextSibling === card)) {
          return;
        }
        if (card.parentNode) {
          card.parentNode.removeChild(card);
        }
        insertAfterElement.insertAdjacentElement('afterend', card);
        return;
      } catch (error) {
        console.error('[FormPosition] Failed to insert form after element:', error);
        // 回退到默认位置
        insertAfterElement = null;
      }
    }
  }
  
  // 默认位置：搜索框下方（在actions之后、ingredients-head之前）
  const actionsDiv = document.querySelector('#view-inventory .actions');
  const ingredientsHead = $('ingredients-head');
  if (actionsDiv && ingredientsHead && ingredientsHead.parentNode) {
    // 如果card已经在正确位置（在actions之后、ingredients-head之前），不需要移动
    if (card.parentNode === ingredientsHead.parentNode && 
        card.previousSibling === actionsDiv &&
        card.nextSibling === ingredientsHead) {
      return;
    }
    if (card.parentNode) {
      card.parentNode.removeChild(card);
    }
    // 插入到ingredients-head之前（即actions之后）
    ingredientsHead.parentNode.insertBefore(card, ingredientsHead);
  } else {
    console.error('[setFormPosition] Cannot set default position, required elements not found');
  }
}

// ============================================
// 辅助函数：管理详细信息区域的显示/隐藏（简化版，统一使用状态管理器）
// ============================================
function setupDetailsSectionVisibility(detailsSection, isEditMode, signal) {
  if (!detailsSection) {
    detailsSectionState.init();
    return;
  }
  
  // 初始化状态管理器
  detailsSectionState.init();
  
  // 获取当前分类
  const classificationSelect = $('i-classification');
  const classification = classificationSelect ? classificationSelect.value : '';
  
  // 更新状态（统一入口）
  detailsSectionState.updateState({
    classification: classification,
    isEditMode: isEditMode
  });
  
  // 编辑模式：不需要监听变化，状态由 openIngredientForm 控制
  // 新增模式：监听分类变化事件（已在 setupIngredientsModule 中设置）
  // 不再需要定期检查、MutationObserver 等复杂逻辑
}

// ============================================
// 主函数：打开原料表单
// ============================================
async function openIngredientForm(id = null, insertAfterElement = null) {
  const startTime = performance.now();
  const card = $('ingredient-form-card');
  const title = $('ingredient-form-title');
  const form = $('ingredient-form');
  const detailsSection = $('ingredient-details-section');
  
  if (!card || !form) {
    console.error('[openIngredientForm] Required elements not found', {
      card: !!card,
      form: !!form,
      cardInDOM: card ? document.contains(card) : false,
      formInDOM: form ? document.contains(form) : false
    });
    
    // 尝试从DOM中查找表单元素（可能被移动了位置）
    const viewInventory = $('view-inventory');
    if (viewInventory) {
      const foundCard = viewInventory.querySelector('#ingredient-form-card');
      const foundForm = viewInventory.querySelector('#ingredient-form');
      
      if (foundCard && foundForm) {
        console.warn('[openIngredientForm] Found form elements in view-inventory, using them');
        // 使用找到的元素
        const finalCard = foundCard;
        const finalForm = foundForm;
        // 确保表单在正确的位置（在actions之后、ingredients-head之前）
        const actionsDiv = document.querySelector('#view-inventory .actions');
        const ingredientsHead = $('ingredients-head');
        if (actionsDiv && ingredientsHead && ingredientsHead.parentNode) {
          // 如果表单不在正确位置，移动到正确位置
          if (finalCard.parentNode !== ingredientsHead.parentNode || 
              finalCard.previousSibling !== actionsDiv ||
              finalCard.nextSibling !== ingredientsHead) {
            if (finalCard.parentNode) {
              finalCard.parentNode.removeChild(finalCard);
            }
            ingredientsHead.parentNode.insertBefore(finalCard, ingredientsHead);
          }
        }
        // 继续执行，使用找到的元素
      } else {
        console.error('[openIngredientForm] Form elements not found anywhere in DOM');
        alert('表单元素丢失，请刷新页面后重试');
        return;
      }
    } else {
      console.error('[openIngredientForm] view-inventory not found');
      alert('无法找到视图容器，请刷新页面后重试');
      return;
    }
    
    // 重新获取元素引用
    const cardAfter = $('ingredient-form-card');
    const formAfter = $('ingredient-form');
    if (!cardAfter || !formAfter) {
      console.error('[openIngredientForm] Still cannot find required elements after restore attempt');
      alert('无法恢复表单元素，请刷新页面后重试');
      return;
    }
  }
  
  // 确定新状态
  const newState = id ? FormState.EDIT : FormState.NEW;
  
  // 切换到新状态（这会自动清理之前的资源）
  ingredientFormState.transition(newState, id);
  const signal = ingredientFormState.abortController?.signal;
  
  // 检查是否已取消
  if (ingredientFormState.isAborted()) {
    console.log('[openIngredientForm] Operation aborted before start');
    return;
  }
  
  // 重置搜索缓存（编辑时重新加载）
  if (id) {
    allIngredientItemsCache = null;
  }
  
  // 设置表单位置（但不显示）
  setFormPosition(card, id, insertAfterElement);
  
  // 打开前填充下拉选项
  populateBrandSelect();
  populateSourceSelect();
  populateSubjectSelect();
  populatePartSelect();
  populateOriginTypeSelect();
  populateUnitSelect();
  populateMainNutrientSelect();

  if (id) {
    // 编辑模式：先加载数据，再显示表单
    // 显示加载遮罩（表单可见但不可操作）
    card.style.display = 'block';
    card.style.opacity = '0.6';
    card.style.pointerEvents = 'none'; // 禁用交互
    
    // 显示加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'ingredient-form-loading';
    loadingIndicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.95);
      padding: 20px 40px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      text-align: center;
    `;
    loadingIndicator.innerHTML = `
      <div style="font-size: 16px; margin-bottom: 10px;">正在加载数据...</div>
      <div style="font-size: 12px; color: #666;">请稍候</div>
    `;
    card.style.position = 'relative';
    card.appendChild(loadingIndicator);
    
    try {
      // 使用统一的 getIngredientById 函数（支持按需查询和缓存）
      const findStartTime = performance.now();
      const ing = await getIngredientById(id);
      const findEndTime = performance.now();
      if (findEndTime - findStartTime > 10) {
        console.warn(`[Performance] Slow ingredient find: ${(findEndTime - findStartTime).toFixed(2)}ms`);
      }
      
      if (!ing) {
        console.error('未找到原料数据，ID:', id);
        loadingIndicator.remove();
        card.style.display = 'none';
        alert('无法加载原料数据，请刷新后重试');
        return;
      }
      // 并行加载类别和项目数据
      const loadStartTime = performance.now();
      
      // 先加载类别数据
      const categoriesPromise = loadCategoriesForForm(ing.classification, true);
      
      // 如果类别已缓存，可以立即开始加载项目
      let itemsPromise = null;
      const cached = categoriesCache.get(ing.classification);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION && ing.category) {
        // 类别已缓存，可以并行加载项目
        itemsPromise = loadItemsForForm(
          ing.classification, 
          ing.category, 
          () => ingredientFormState.isAborted(), 
          signal, 
          cached.data
        );
      }
      
      // 等待类别加载完成
      const categories = await categoriesPromise;
      const categoriesLoadTime = performance.now();
      console.log(`[Performance] Categories loaded in ${(categoriesLoadTime - loadStartTime).toFixed(2)}ms`);
      
      if (ingredientFormState.isAborted()) {
        loadingIndicator.remove();
        card.style.display = 'none';
        return;
      }
      
      // 如果项目还没开始加载，现在加载
      if (!itemsPromise && ing.category && ing.name && ing.classification !== '包材') {
        itemsPromise = loadItemsForForm(
          ing.classification, 
          ing.category, 
          () => ingredientFormState.isAborted(), 
          signal, 
          categories
        );
      }
      
      // 等待项目加载完成（如果有）
      if (itemsPromise) {
        await itemsPromise;
        const itemsLoadTime = performance.now();
        console.log(`[Performance] Items loaded in ${(itemsLoadTime - categoriesLoadTime).toFixed(2)}ms`);
      }
      
      const totalLoadTime = performance.now();
      console.log(`[Performance] Total data load time: ${(totalLoadTime - loadStartTime).toFixed(2)}ms`);
      
      if (ingredientFormState.isAborted()) {
        loadingIndicator.remove();
        card.style.display = 'none';
        return;
      }
      
      // 数据加载完成，移除加载指示器，显示表单
      loadingIndicator.remove();
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto'; // 启用交互
      
      const displayTime = performance.now();
      console.log(`[Performance] Form displayed in ${(displayTime - startTime).toFixed(2)}ms`);
      
      // 编辑模式下隐藏搜索框
      const searchInput = $('i-ingredient-search');
      const searchContainer = searchInput?.parentElement?.parentElement;
      if (searchContainer) {
        searchContainer.style.display = 'none';
      }
      
      // 填充表单数据
      if (title) title.textContent = '编辑原料';
      $('ingredient-id').value = ing.id;
      $('i-code').value = ing.code || '';
      
      // 设置原料分类
      const classificationSelect = $('i-classification');
      if (classificationSelect && ing.classification) {
        classificationSelect.value = ing.classification;
        // 更新字段显示/隐藏
        updateIngredientFieldsVisibility(ing.classification);
      }
      
      // 填充品牌和采购渠道下拉框
      populateBrandSelect();
      populateSourceSelect();
      // 填充所属科目、部位、产地类型、主要营养素下拉框
      populateSubjectSelect();
      populatePartSelect();
      populateOriginTypeSelect();
      populateMainNutrientSelect();
      
      // 设置类别值
      const categorySelect = $('i-category');
      if (categorySelect && ing.category) {
        const categoryExists = Array.from(categorySelect.options).some(opt => opt.value === ing.category);
        if (categoryExists) {
          categorySelect.value = ing.category;
        } else {
          const option = document.createElement('option');
          option.value = ing.category;
          option.textContent = ing.category;
          categorySelect.appendChild(option);
          categorySelect.value = ing.category;
        }
      }
      
      // 设置食材名称（如果有）
      if (ing.name && ing.classification !== '包材') {
        const nameSelect = $('i-name');
        if (nameSelect && nameSelect.tagName === 'SELECT') {
          // 确保选项已加载
          if (nameSelect.options && nameSelect.options.length > 0) {
            nameSelect.value = ing.name;
            // 设置 itemId
            const selectedOption = Array.from(nameSelect.options).find(opt => opt.value === ing.name);
            if (selectedOption && selectedOption.dataset && selectedOption.dataset.itemId) {
              const itemIdInput = $('i-name-item-id');
              if (itemIdInput) {
                itemIdInput.value = selectedOption.dataset.itemId;
              }
            }
          }
        }
      }
      
      // 设置品牌和采购渠道值
      const brandSelect = $('i-brand');
      if (brandSelect && ing.brand) {
        const brandExists = Array.from(brandSelect.options).some(opt => opt.value === ing.brand);
        if (brandExists) {
          brandSelect.value = ing.brand;
        } else {
          const option = document.createElement('option');
          option.value = ing.brand;
          option.textContent = ing.brand;
          brandSelect.appendChild(option);
          brandSelect.value = ing.brand;
        }
      }
      
      const sourceSelect = $('i-source');
      if (sourceSelect) {
        const sourceValue = (ing.source !== null && ing.source !== undefined && ing.source !== '') 
          ? String(ing.source).trim() 
          : '';
        if (sourceValue) {
          const sourceExists = Array.from(sourceSelect.options).some(opt => opt.value === sourceValue);
          if (sourceExists) {
            sourceSelect.value = sourceValue;
          } else {
            const option = document.createElement('option');
            option.value = sourceValue;
            option.textContent = sourceValue;
            sourceSelect.appendChild(option);
            sourceSelect.value = sourceValue;
          }
        }
      }
      
      // 设置其他字段
      $('i-cost').value = ing.cost || '';
      $('i-quantity').value = ing.quantity || '';
      // 修复：如果 ing.unit 是空字符串，应该保持为空字符串，而不是默认值 'g'
      // 但如果是 null 或 undefined，才使用默认值 'g'
      // 同时，如果选项不存在，需要动态添加
      const unitSelect = $('i-unit');
      if (unitSelect) {
        const unitValue = (ing.unit !== null && ing.unit !== undefined && ing.unit !== '') ? ing.unit : 'g';
        const unitExists = Array.from(unitSelect.options).some(opt => opt.value === unitValue);
        if (unitExists) {
          unitSelect.value = unitValue;
        } else {
          // 如果选项不存在，动态添加
          const option = document.createElement('option');
          option.value = unitValue;
          option.textContent = unitValue;
          unitSelect.appendChild(option);
          unitSelect.value = unitValue;
          // 同时保存到单位列表，以便下次使用
          const currentUnits = getUnits();
          if (!currentUnits.includes(unitValue)) {
            saveUnits([...currentUnits, unitValue]);
          }
        }
      }
      
      // 设置新字段（根据分类）
      if (ing.classification === '食材') {
        // 所属科目
        if ($('i-subject')) {
          const subjectValue = (ing.subject !== null && ing.subject !== undefined) ? ing.subject : '';
          if (subjectValue) {
            const subjectSelect = $('i-subject');
            const subjectExists = Array.from(subjectSelect.options).some(opt => opt.value === subjectValue);
            if (subjectExists) {
              subjectSelect.value = subjectValue;
            } else {
              // 如果选项不存在，动态添加
              const option = document.createElement('option');
              option.value = subjectValue;
              option.textContent = subjectValue;
              subjectSelect.appendChild(option);
              subjectSelect.value = subjectValue;
              // 同时保存到所属科目列表
              const currentSubjects = getSubjects();
              if (!currentSubjects.includes(subjectValue)) {
                saveSubjects([...currentSubjects, subjectValue]);
              }
            }
          } else {
            $('i-subject').value = '';
          }
        }
        
        // 部位
        if ($('i-part')) {
          const partValue = (ing.part !== null && ing.part !== undefined) ? ing.part : '';
          if (partValue) {
            const partSelect = $('i-part');
            const partExists = Array.from(partSelect.options).some(opt => opt.value === partValue);
            if (partExists) {
              partSelect.value = partValue;
            } else {
              // 如果选项不存在，动态添加
              const option = document.createElement('option');
              option.value = partValue;
              option.textContent = partValue;
              partSelect.appendChild(option);
              partSelect.value = partValue;
              // 同时保存到部位列表
              const currentParts = getParts();
              if (!currentParts.includes(partValue)) {
                saveParts([...currentParts, partValue]);
              }
            }
          } else {
            $('i-part').value = '';
          }
        }
        
        // 产地类型
        if ($('i-originType')) {
          const originTypeValue = (ing.originType !== null && ing.originType !== undefined) ? ing.originType : '';
          if (originTypeValue) {
            const originTypeSelect = $('i-originType');
            const originTypeExists = Array.from(originTypeSelect.options).some(opt => opt.value === originTypeValue);
            if (originTypeExists) {
              originTypeSelect.value = originTypeValue;
            } else {
              // 如果选项不存在，动态添加
              const option = document.createElement('option');
              option.value = originTypeValue;
              option.textContent = originTypeValue;
              originTypeSelect.appendChild(option);
              originTypeSelect.value = originTypeValue;
              // 同时保存到产地类型列表
              const currentOriginTypes = getOriginTypes();
              if (!currentOriginTypes.includes(originTypeValue)) {
                saveOriginTypes([...currentOriginTypes, originTypeValue]);
              }
            }
          } else {
            $('i-originType').value = '';
          }
        }
      }
      if ($('i-model')) $('i-model').value = ing.model || '';
      if (ing.classification === '营养补充剂') {
        if ($('i-mainNutrient')) {
          const mainNutrientValue = (ing.mainNutrient !== null && ing.mainNutrient !== undefined) ? ing.mainNutrient : '';
          if (mainNutrientValue) {
            const mainNutrientSelect = $('i-mainNutrient');
            const mainNutrientExists = Array.from(mainNutrientSelect.options).some(opt => opt.value === mainNutrientValue);
            if (mainNutrientExists) {
              mainNutrientSelect.value = mainNutrientValue;
            } else {
              // 如果选项不存在，动态添加
              const option = document.createElement('option');
              option.value = mainNutrientValue;
              option.textContent = mainNutrientValue;
              mainNutrientSelect.appendChild(option);
              mainNutrientSelect.value = mainNutrientValue;
              // 同时保存到主要营养素列表，以便下次使用
              const currentMainNutrients = getMainNutrients();
              if (!currentMainNutrients.includes(mainNutrientValue)) {
                saveMainNutrients([...currentMainNutrients, mainNutrientValue]);
              }
            }
          } else {
            $('i-mainNutrient').value = '';
          }
        }
        if ($('i-unitContent')) {
          // 修复：如果 unitContent 是 0，应该显示 '0'，而不是空字符串
          $('i-unitContent').value = (ing.unitContent !== null && ing.unitContent !== undefined) ? String(ing.unitContent) : '';
        }
        if ($('i-nutrientUnit')) {
          // 修复：确保 nutrientUnit 正确显示，即使值为空字符串
          $('i-nutrientUnit').value = (ing.nutrientUnit !== null && ing.nutrientUnit !== undefined) ? ing.nutrientUnit : '';
        }
        if ($('i-pricePer100NutrientUnit')) {
          // 修复：如果 pricePer100NutrientUnit 是 0，应该显示 '0'，而不是空字符串
          $('i-pricePer100NutrientUnit').value = (ing.pricePer100NutrientUnit !== null && ing.pricePer100NutrientUnit !== undefined) ? String(ing.pricePer100NutrientUnit) : '';
        }
      }
      $('i-pricePer500').value = ing.pricePer500 || '';
      const ediblePortionPercent = ing.ediblePortion !== undefined ? Math.round(ing.ediblePortion * 100) : 100;
      $('i-ediblePortion').value = ediblePortionPercent;
      $('i-ediblePricePer500').value = ing.ediblePricePer500 || '';
      $('i-weightPerUnit').value = ing.weightPerUnit || '';
      $('i-description').value = ing.description || '';
      $('i-mainFunction').value = ing.mainFunction || '';
      
      // 更新单位标签和价格字段
      updateUnitBasedLabels();
      updateIngredientPriceFields();
      
      // 显示详细信息区域（编辑模式始终显示）
      detailsSectionState.init();
      detailsSectionState.updateState({
        classification: ing.classification || '',
        isEditMode: true
      });
      
      // 详细信息区域的显示/隐藏已由 detailsSectionState 统一管理，无需额外设置
      
      const totalTime = performance.now();
      console.log(`[Performance] Total form open time: ${(totalTime - startTime).toFixed(2)}ms`);
      
    } catch (error) {
      // 加载失败，移除加载指示器，显示错误
      loadingIndicator.remove();
      card.style.display = 'none';
      console.error('[openIngredientForm] Failed to load data:', error);
      alert('加载数据失败：' + error.message);
      return;
    }
  } else {
    // 新增模式：直接显示表单（不需要加载数据）
    card.style.display = 'block';
    
    // 新增模式下显示搜索框
    const searchInput = $('i-ingredient-search');
    const searchContainer = searchInput?.parentElement?.parentElement; // 获取包含label的容器
    if (searchContainer) {
      searchContainer.style.display = '';
    }
    
    // 注意：状态管理已迁移到 ingredientFormState，这里不需要额外的操作标识
    
    if (title) title.textContent = '新增原料';
    
    // 在reset之前，先保存当前的分类状态（如果已选择）
    const classificationSelect = $('i-classification');
    const currentClassificationBeforeReset = classificationSelect ? classificationSelect.value : '';
    
    // 重置表单（这会清空所有字段，包括select的options）
    // 在reset之前，确保nameSelect存在且可访问
    const nameSelectBeforeReset = $('i-name');
    if (nameSelectBeforeReset && nameSelectBeforeReset.tagName === 'SELECT') {
      // 先清空，避免reset时出现问题
      nameSelectBeforeReset.innerHTML = '<option value="">请先选择原料分类和类别</option>';
    }
    
    form.reset();
    
    // 重置后，确保nameSelect的初始状态
    const nameSelect = $('i-name');
    if (nameSelect && nameSelect.tagName === 'SELECT') {
      // 确保options存在（即使为空）
      if (!nameSelect.options || nameSelect.options.length === 0) {
        // 如果options不存在或为空，创建一个空的select
        nameSelect.innerHTML = '<option value="">请先选择原料分类和类别</option>';
      }
    }
    $('ingredient-id').value = '';
    $('i-ediblePortion').value = '100';
    $('i-code').value = '';
    
    // 新增模式：清空分类，确保字段正确隐藏
    if (classificationSelect) {
      classificationSelect.value = '';
      // 更新字段显示/隐藏（清空分类会隐藏所有字段）
      updateIngredientFieldsVisibility('');
      // 触发change事件以重置类别列表
      classificationSelect.dispatchEvent(new Event('change'));
    }
    
    const categorySelect = $('i-category');
    if (categorySelect) categorySelect.innerHTML = '<option value="">请选择类别</option>';
    
    const nameSelectEl = $('i-name');
    const hiddenItemId = $('i-name-item-id');
    const ingredientSearchInput = $('i-ingredient-search');
    if (nameSelectEl) {
      nameSelectEl.innerHTML = '<option value="">请先选择原料分类和类别</option>';
      nameSelectEl.value = '';
    }
    if (hiddenItemId) hiddenItemId.value = '';
    if (ingredientSearchInput) ingredientSearchInput.value = '';
    
    // 加载品牌和采购渠道下拉框
    populateBrandSelect();
    populateSourceSelect();
    populateMainNutrientSelect();
    
    // reset之后：使用统一的状态管理器更新显示/隐藏
    // 新增模式下，确保分类为空，字段正确隐藏
    const finalClassification = ''; // 新增模式，分类应该为空
    const isEditMode = false; // 新增模式
    detailsSectionState.updateState({
      classification: finalClassification,
      isEditMode: isEditMode
    });
    console.log('Updated details section state after reset (new mode):', { classification: finalClassification, isEditMode: isEditMode });
    
    // 确保包材分类时隐藏食材名称字段
    const nameLabel = $('i-name-label');
    const nameSelectEl2 = $('i-name');
    if (nameLabel) {
      nameLabel.style.display = '';
    }
    if (nameSelectEl2) {
      nameSelectEl2.innerHTML = '<option value="">请先选择原料分类和类别</option>';
    }
  }
  
  // 更新单位标签和价格字段
  updateUnitBasedLabels();
  updateIngredientPriceFields();
  
  // 设置表单状态标记（用于CSS选择器）
  if (id) {
    card.setAttribute('data-editing', 'true');
    // 编辑模式：显示重新生成编号按钮
    const regenerateBtn = $('btn-regenerate-code');
    if (regenerateBtn) {
      regenerateBtn.style.display = 'block';
    }
  } else {
    card.removeAttribute('data-editing');
    // 新增模式：隐藏重新生成编号按钮
    const regenerateBtn = $('btn-regenerate-code');
    if (regenerateBtn) {
      regenerateBtn.style.display = 'none';
    }
  }
  
  // 设置详细信息区域的显示/隐藏管理（新增和编辑模式都需要）
  // 初始化状态管理器
  detailsSectionState.init();
  
  // 获取当前分类和模式
  const classificationSelect = $('i-classification');
  const currentClassification = classificationSelect ? classificationSelect.value : '';
  const isEditMode = ingredientFormState.isEditMode();
  
  // 使用统一的状态管理器更新显示/隐藏（单一入口）
  detailsSectionState.updateState({
    classification: currentClassification,
    isEditMode: isEditMode
  });
  
  // 如果分类已选择，更新字段显示/隐藏
  if (currentClassification && currentClassification.trim() !== '') {
    updateIngredientFieldsVisibility(currentClassification);
  }
  
  // 新增模式：如果已经有分类被选择（比如通过搜索选择），延迟刷新确保状态同步
  if (!id && currentClassification && currentClassification.trim() !== '') {
    setTimeout(() => {
      detailsSectionState.updateState({
        classification: currentClassification,
        isEditMode: false
      });
    }, 100);
  }
  
  // 在显示表单之前，再次确认位置（编辑模式）
  if (id && insertAfterElement) {
    // 延迟检查，确保表单没有被其他代码移动
    setTimeout(() => {
      if (card.parentNode !== insertAfterElement.parentNode || card.previousSibling !== insertAfterElement) {
        console.warn('Form position was changed, re-inserting...');
        if (card.parentNode) {
          card.parentNode.removeChild(card);
        }
        try {
          insertAfterElement.insertAdjacentElement('afterend', card);
          console.log('Form re-inserted successfully');
        } catch (error) {
          console.error('Failed to re-insert form:', error);
        }
      }
    }, 10);
  }
  
  // 注意：表单已经在函数开始处显示，这里不需要重复显示
  // 注意：详细信息区域的显示/隐藏已由 detailsSectionState 统一管理
  
  // 滚动到表单位置，让表单可见（异步执行，不阻塞）
  requestAnimationFrame(() => {
    if (card) {
      if (id && insertAfterElement) {
        // 编辑模式：滚动到被编辑的行和表单的位置
        insertAfterElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      } else {
        // 新增模式：滚动到表单位置
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          const rect = card.getBoundingClientRect();
          const offset = 20; // 距离顶部的偏移量
          if (rect.top < offset || rect.top > window.innerHeight) {
            window.scrollBy({ top: rect.top - offset, behavior: 'smooth' });
          }
        }, 50);
      }
    }
  });
  
  // 注意：详细信息区域的显示/隐藏已由 detailsSectionState 统一管理
  // 取消按钮的处理也已经在前面设置
}

async function deleteIngredient(id) {
  if (!confirm('确定要删除这个原料吗？')) return;
  
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  try {
    const ingredient = store.ingredients.find(x => x.id === id);
    if (!ingredient || !ingredient._backendId) {
      alert('无法找到原料的后端ID');
      return;
    }
    
    await backendRequest(`/api/v1/ingredients/${ingredient._backendId}`, {
      method: 'DELETE'
    });
    
    alert('删除成功！');
    await loadIngredientsFromBackend();
    await loadAllIngredientsForFilters();
  } catch (error) {
    console.error('删除原料失败:', error);
    alert('删除失败：' + error.message);
  }
}
// 批量生成缺失的编号
async function generateMissingCodes() {
  // 找出所有编号为空或无效的原料（只检查编号）
  const missingCodes = store.ingredients.filter(ing => {
    return !ing.code || ing.code.trim() === '';
  });
  
  if (missingCodes.length === 0) {
    alert('所有原料都已拥有编号！');
    return;
  }
  
  // 统计需要生成编号的数量（有类别和项目的）
  const validMissing = missingCodes.filter(ing => ing.category && ing.name);
  const invalidMissing = missingCodes.length - validMissing.length;
  
  if (validMissing.length === 0) {
    alert(`有 ${invalidMissing} 条原料缺少类别或项目名称，无法生成编号。请先完善这些原料的信息。`);
    return;
  }
  
  const confirmMsg = `发现 ${validMissing.length} 条原料缺少编号，${invalidMissing > 0 ? `另有 ${invalidMissing} 条缺少类别或项目名称。` : ''}\n是否要为缺少编号的原料自动生成编号？\n\n注意：操作前会自动创建备份。`;
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  if (!backendState.token) {
    alert('请先登录才能生成编号');
    return;
  }
  
  // 为每个缺少编号的原料生成编号并更新到后端
  let generated = 0;
  let failed = 0;
  
  for (const ing of validMissing) {
    if (!ing.code || ing.code.trim() === '') {
      const code = await generateIngredientCode(ing.classification || '食材', ing.category, ing.id);
      if (code && ing._backendId) {
        try {
          await backendRequest(`/api/v1/ingredients/${ing._backendId}`, {
            method: 'PUT',
            body: { code: code }
          });
          ing.code = code;
          generated++;
        } catch (error) {
          console.error(`更新编号失败: ${code}`, error);
          failed++;
        }
      } else {
        console.warn('生成编号失败:', ing.category, ing.name);
        failed++;
      }
    }
  }
  
  // 重新加载列表
  await loadIngredientsFromBackend();
  updateNameFilterSelect();
  alert(`编号生成完成！\n成功生成: ${generated} 条\n失败: ${failed} 条${invalidMissing > 0 ? `\n缺少类别/项目: ${invalidMissing} 条` : ''}`);
}

// Excel导入功能已移除，数据已迁移到后端

// 从本地localStorage导入原料数据到后端
async function importLocalIngredients() {
  if (!backendState.token) {
    alert('请先登录才能导入数据');
    return;
  }
  
  // 从localStorage读取本地原料数据
  const storageKeys = ['pff-app-v2', 'pff-app-v1', 'pff-app'];
  let localIngredients = [];
  
  for (const key of storageKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw && raw.length > 2) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
          localIngredients = data.ingredients;
          console.log(`从 ${key} 找到 ${localIngredients.length} 条本地原料数据`);
          break; // 找到数据就停止
        }
      }
    } catch (e) {
      console.warn(`读取 ${key} 失败:`, e);
    }
  }
  
  if (localIngredients.length === 0) {
    alert('未找到本地原料数据。请确保之前使用过本地存储功能。');
    return;
  }
  
  // 确认导入
  const confirmMsg = `找到 ${localIngredients.length} 条本地原料数据，是否要导入到后端？\n\n注意：如果后端已有相同编号的原料，可能会跳过或更新。`;
  if (!confirm(confirmMsg)) {
    return;
  }
  
  // 批量导入
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const errors = [];
  
  // 显示进度提示
  const progressMsg = `正在导入 ${localIngredients.length} 条数据，请稍候...`;
  console.log(progressMsg);
  
  for (let i = 0; i < localIngredients.length; i++) {
    const ing = localIngredients[i];
    
    // 转换数据格式（从本地格式转换为后端格式）
    const data = {
      code: ing.code || '',
      category: ing.category || '',
      name: ing.name || '',
      brand: ing.brand || null,
      cost: ing.cost || null,
      quantity: ing.quantity || null,
      unit: ing.unit || 'g',
      pricePer500: ing.pricePer500 || null,
      // 可食部：本地可能是百分比（0-100），需要转换为小数（0-1）
      ediblePortion: ing.ediblePortion !== undefined 
        ? (ing.ediblePortion > 1 ? ing.ediblePortion / 100 : ing.ediblePortion)
        : 1.0,
      ediblePricePer500: ing.ediblePricePer500 || null,
      weightPerUnit: ing.weightPerUnit || null,
      classification: ing.classification || null,
      description: ing.description || null,
      mainFunction: ing.mainFunction || null
    };
    
    // 跳过没有类别或名称的数据
    if (!data.category || !data.name) {
      skipCount++;
      console.warn(`跳过第 ${i + 1} 条数据：缺少类别或名称`, ing);
      continue;
    }
    
    try {
      // 尝试创建
      await backendRequest('/api/v1/ingredients', {
        method: 'POST',
        body: data
      });
      successCount++;
      
      // 每10条显示一次进度
      if ((i + 1) % 10 === 0) {
        console.log(`已导入 ${i + 1}/${localIngredients.length} 条...`);
      }
    } catch (error) {
      failCount++;
      const errorMsg = error.message || String(error);
      errors.push(`第 ${i + 1} 条 (${data.name}): ${errorMsg}`);
      
      // 如果是重复数据错误，计入跳过
      if (errorMsg.includes('duplicate') || errorMsg.includes('已存在') || errorMsg.includes('重复')) {
        skipCount++;
        failCount--; // 不算失败
      }
      
      console.error(`导入第 ${i + 1} 条失败:`, errorMsg);
    }
    
    // 避免请求过快，每10条稍作延迟
    if ((i + 1) % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // 显示结果
  let resultMsg = `导入完成！\n成功: ${successCount} 条\n`;
  if (skipCount > 0) {
    resultMsg += `跳过: ${skipCount} 条（缺少类别/名称或已存在）\n`;
  }
  if (failCount > 0) {
    resultMsg += `失败: ${failCount} 条\n`;
  }
  
  if (errors.length > 0 && errors.length <= 10) {
    resultMsg += `\n错误详情：\n${errors.slice(0, 10).join('\n')}`;
    if (errors.length > 10) {
      resultMsg += `\n...还有 ${errors.length - 10} 个错误`;
    }
  }
  
  alert(resultMsg);
  console.log('导入结果:', { successCount, skipCount, failCount, total: localIngredients.length });
  
  // 重新加载列表
  await loadIngredientsFromBackend();
  updateNameFilterSelect();
}

// 从Excel文件导入原料数据
async function importIngredientsFromExcel(file) {
  if (!backendState.token) {
    alert('请先登录才能导入数据');
    return;
  }
  
  // 检查xlsx库是否已加载
  if (typeof XLSX === 'undefined') {
    alert('Excel解析库未加载，请刷新页面重试');
    return;
  }
  
  console.log('开始读取Excel文件:', file.name);
  
  try {
    // 读取Excel文件
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
    
    // 获取第一个工作表
    const firstSheetName = data.SheetNames[0];
    const worksheet = data.Sheets[firstSheetName];
    
    // 转换为JSON（第一行作为表头）
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // 使用数组格式，第一行是表头
      defval: null // 空单元格返回null
    });
    
    if (jsonData.length < 2) {
      alert('Excel文件数据为空或格式不正确');
      return;
    }
    
    console.log('Excel数据行数:', jsonData.length);
    console.log('表头:', jsonData[0]);
    
    // 解析表头，找到对应的列索引
    const headers = jsonData[0].map(h => String(h || '').trim().toLowerCase());
    const headerMap = {};
    
    // 常见的中文表头映射
    const headerMappings = {
      '编号': 'code',
      'code': 'code',
      '类别': 'category',
      'category': 'category',
      '项目': 'name',
      '名称': 'name',
      'name': 'name',
      '品牌': 'brand',
      '来源': 'brand',
      'brand': 'brand',
      '费用': 'cost',
      '采购价格': 'cost',
      '价格': 'cost',
      'cost': 'cost',
      '单量': 'quantity',
      '采购数量': 'quantity',
      '数量': 'quantity',
      'quantity': 'quantity',
      '单位': 'unit',
      'unit': 'unit',
      '单价/500单位': 'pricePer500',
      '单价': 'pricePer500',
      'priceper500': 'pricePer500',
      '可食部': 'ediblePortion',
      '可食部%': 'ediblePortion',
      'edibleportion': 'ediblePortion',
      '可食部单价/500单位': 'ediblePricePer500',
      'ediblepriceper500': 'ediblePricePer500',
      '每单位重量': 'weightPerUnit',
      'weightperunit': 'weightPerUnit',
      '说明': 'description',
      '描述': 'description',
      'description': 'description',
      '主要作用': 'mainFunction',
      'mainfunction': 'mainFunction'
    };
    
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase();
      for (const [chinese, english] of Object.entries(headerMappings)) {
        if (normalized.includes(chinese.toLowerCase()) || normalized === english.toLowerCase()) {
          headerMap[english] = index;
          break;
        }
      }
    });
    
    console.log('表头映射:', headerMap);
    
    // 检查必需字段
    if (headerMap.category === undefined || headerMap.name === undefined) {
      alert('Excel文件缺少必需字段（类别、项目/名称）。请检查表头是否正确。\n\n找到的表头：' + headers.join(', '));
      return;
    }
    
    // 转换数据
    const ingredients = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const category = row[headerMap.category] ? String(row[headerMap.category]).trim() : '';
      const name = row[headerMap.name] ? String(row[headerMap.name]).trim() : '';
      
      // 跳过空行
      if (!category && !name) continue;
      
      // 解析数值字段
      const parseNumber = (val) => {
        if (val == null || val === '') return null;
        const num = typeof val === 'number' ? val : parseFloat(String(val));
        return isNaN(num) ? null : num;
      };
      
      // 解析可食部（可能是百分比或小数）
      let ediblePortion = 1.0;
      if (headerMap.ediblePortion !== undefined) {
        const val = row[headerMap.ediblePortion];
        if (val != null && val !== '') {
          const num = parseNumber(val);
          if (num != null) {
            // 如果大于1，认为是百分比，转换为小数
            ediblePortion = num > 1 ? num / 100 : num;
            ediblePortion = Math.max(0, Math.min(1, ediblePortion)); // 限制在0-1之间
          }
        }
      }
      
      const ingredient = {
        code: headerMap.code !== undefined ? String(row[headerMap.code] || '').trim() : '',
        category: category,
        name: name,
        brand: headerMap.brand !== undefined ? String(row[headerMap.brand] || '').trim() || null : null,
        cost: headerMap.cost !== undefined ? parseNumber(row[headerMap.cost]) : null,
        quantity: headerMap.quantity !== undefined ? parseNumber(row[headerMap.quantity]) : null,
        unit: headerMap.unit !== undefined ? String(row[headerMap.unit] || 'g').trim() : 'g',
        pricePer500: headerMap.pricePer500 !== undefined ? parseNumber(row[headerMap.pricePer500]) : null,
        ediblePortion: ediblePortion,
        ediblePricePer500: headerMap.ediblePricePer500 !== undefined ? parseNumber(row[headerMap.ediblePricePer500]) : null,
        weightPerUnit: headerMap.weightPerUnit !== undefined ? parseNumber(row[headerMap.weightPerUnit]) : null,
        classification: null, // 预留字段
        description: headerMap.description !== undefined ? String(row[headerMap.description] || '').trim() || null : null,
        mainFunction: headerMap.mainFunction !== undefined ? String(row[headerMap.mainFunction] || '').trim() || null : null
      };
      
      ingredients.push(ingredient);
    }
    
    if (ingredients.length === 0) {
      alert('Excel文件中没有有效的原料数据');
      return;
    }
    
    // 确认导入
    const confirmMsg = `从Excel文件解析到 ${ingredients.length} 条原料数据，是否要导入到后端？\n\n注意：如果后端已有相同编号的原料，可能会跳过。`;
    if (!confirm(confirmMsg)) {
      return;
    }
    
    // 批量导入
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    const errors = [];
    
    console.log(`开始导入 ${ingredients.length} 条数据...`);
    
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i];
      
      // 跳过没有类别或名称的数据
      if (!ing.category || !ing.name) {
        skipCount++;
        console.warn(`跳过第 ${i + 1} 条数据：缺少类别或名称`);
        continue;
      }
      
      try {
        await backendRequest('/api/v1/ingredients', {
          method: 'POST',
          body: ing
        });
        successCount++;
        
        // 每10条显示一次进度
        if ((i + 1) % 10 === 0) {
          console.log(`已导入 ${i + 1}/${ingredients.length} 条...`);
        }
      } catch (error) {
        failCount++;
        const errorMsg = error.message || String(error);
        errors.push(`第 ${i + 1} 条 (${ing.name}): ${errorMsg}`);
        
        // 如果是重复数据错误，计入跳过
        if (errorMsg.includes('duplicate') || errorMsg.includes('已存在') || errorMsg.includes('重复')) {
          skipCount++;
          failCount--; // 不算失败
        }
        
        console.error(`导入第 ${i + 1} 条失败:`, errorMsg);
      }
      
      // 避免请求过快，每10条稍作延迟
      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 显示结果
    let resultMsg = `导入完成！\n成功: ${successCount} 条\n`;
    if (skipCount > 0) {
      resultMsg += `跳过: ${skipCount} 条（缺少类别/名称或已存在）\n`;
    }
    if (failCount > 0) {
      resultMsg += `失败: ${failCount} 条\n`;
    }
    
    if (errors.length > 0 && errors.length <= 10) {
      resultMsg += `\n错误详情：\n${errors.slice(0, 10).join('\n')}`;
      if (errors.length > 10) {
        resultMsg += `\n...还有 ${errors.length - 10} 个错误`;
      }
    }
    
    alert(resultMsg);
    console.log('导入结果:', { successCount, skipCount, failCount, total: ingredients.length });
    
    // 重新加载列表
    await loadIngredientsFromBackend();
    await loadAllIngredientsForFilters();
    
  } catch (error) {
    console.error('导入Excel文件失败:', error);
    alert('导入失败：' + error.message);
  }
}

// ========== 分类管理模块 ==========

// 加载分类列表
async function loadCategoriesFromBackend(classification) {
  if (!backendState.token) {
    console.warn('未登录，无法加载分类');
    // 未登录时，从store.ingredients中提取分类
    return await extractCategoriesFromIngredients(classification);
  }
  
  try {
    const params = new URLSearchParams();
    if (classification) {
      params.append('classification', classification);
    }
    params.append('pageSize', '1000');
    
    const response = await backendRequest(`/api/v1/ingredient-categories?${params.toString()}`, {
      method: 'GET'
    });
    
    const data = response?.data || response;
    const items = Array.isArray(data) ? data : (data.items || []);
    return items;
  } catch (error) {
    // 404/400/484错误时，从现有数据中提取分类作为后备方案
    const errorMessage = error.message || '';
    if (errorMessage.includes('404') || errorMessage.includes('Not Found') || 
        errorMessage.includes('400') || errorMessage.includes('484') ||
        errorMessage.includes('Resource not found')) {
      // 从store.ingredients中提取分类
      return await extractCategoriesFromIngredients(classification);
    }
    // 其他错误才记录（但不显示给用户）
    console.log('[loadCategoriesFromBackend] 非404错误:', errorMessage);
    // 其他错误也尝试从现有数据中提取
    return await extractCategoriesFromIngredients(classification);
  }
}

// 从store.ingredients中提取分类数据
async function extractCategoriesFromIngredients(classification) {
  console.log('[extractCategoriesFromIngredients] 开始提取分类，classification:', classification, 'store.ingredients.length:', store.ingredients?.length || 0);
  
  let allIngredients = [];
  
  // 如果store.ingredients为空或数据很少，尝试加载所有原料数据
  if (!store.ingredients || store.ingredients.length === 0 || store.ingredients.length < 50) {
    try {
      console.log('[extractCategoriesFromIngredients] 尝试加载所有原料数据...');
      // 尝试加载所有原料数据（用于提取分类）
      const response = await backendRequest('/api/v1/ingredients?pageSize=10000');
      const rawItems = response.items || [];
      console.log('[extractCategoriesFromIngredients] 后端返回的原始数据数量:', rawItems.length);
      
      // 调试：查看前10条数据的完整信息
      if (rawItems.length > 0) {
        console.log('[extractCategoriesFromIngredients] 前10条原始数据示例:', rawItems.slice(0, 10).map(ing => ({
          id: ing.id,
          name: ing.name,
          category: ing.category,
          classification: ing.classification
        })));
      }
      
      allIngredients = rawItems.map(ing => ({
        id: ing.id,
        category: ing.category,
        classification: ing.classification,
        name: ing.name
      }));
      
      // 调试：统计所有分类和类别
      const allClassificationCount = {};
      const allCategoryCount = {};
      allIngredients.forEach(ing => {
        if (ing.classification) {
          allClassificationCount[ing.classification] = (allClassificationCount[ing.classification] || 0) + 1;
        }
        if (ing.classification === classification && ing.category) {
          const catName = ing.category.trim();
          allCategoryCount[catName] = (allCategoryCount[catName] || 0) + 1;
        }
      });
      console.log('[extractCategoriesFromIngredients] 所有原料的分类统计:', allClassificationCount);
      console.log('[extractCategoriesFromIngredients] 该分类下的所有类别统计:', allCategoryCount);
      
      console.log('[extractCategoriesFromIngredients] 加载了', allIngredients.length, '条原料数据');
    } catch (error) {
      // 如果加载失败，使用现有的store.ingredients
      console.log('[extractCategoriesFromIngredients] 加载所有原料失败，使用现有数据:', error.message);
      allIngredients = store.ingredients || [];
    }
  } else {
    allIngredients = store.ingredients;
  }
  
  // 提取分类
  const categories = extractCategoriesFromArray(allIngredients, classification);
  console.log('[extractCategoriesFromIngredients] 提取到', categories.length, '个分类:', categories.map(c => c.category));
  
  if (categories.length === 0) {
    console.warn('[extractCategoriesFromIngredients] 警告：未提取到任何分类，allIngredients.length:', allIngredients.length, 'classification:', classification);
    // 调试：查看所有原料的分类分布
    const classificationMap = {};
    const categoryDistribution = {};
    allIngredients.forEach(ing => {
      if (ing.classification) {
        classificationMap[ing.classification] = (classificationMap[ing.classification] || 0) + 1;
      }
      if (ing.classification === classification && ing.category) {
        const catName = ing.category.trim();
        categoryDistribution[catName] = (categoryDistribution[catName] || 0) + 1;
      }
    });
    console.log('[extractCategoriesFromIngredients] 所有原料的分类分布:', classificationMap);
    console.log('[extractCategoriesFromIngredients] 该分类下的类别分布:', categoryDistribution);
  } else {
    // 即使提取到了分类，也显示类别分布以便调试
    const categoryDistribution = {};
    allIngredients.forEach(ing => {
      if (ing.classification === classification && ing.category) {
        const catName = ing.category.trim();
        categoryDistribution[catName] = (categoryDistribution[catName] || 0) + 1;
      }
    });
    console.log('[extractCategoriesFromIngredients] 该分类下的类别分布:', categoryDistribution);
  }
  
  return categories;
}

// 从原料数组中提取分类数据（辅助函数）
function extractCategoriesFromArray(ingredients, classification) {
  if (!ingredients || ingredients.length === 0) {
    console.warn('[extractCategoriesFromArray] 原料数组为空');
    return [];
  }
  
  console.log('[extractCategoriesFromArray] 开始提取，ingredients.length:', ingredients.length, 'classification:', classification);
  
  // 调试：先统计所有原料的分类和类别分布
  const allClassificationStats = {};
  const allCategoryStats = {};
  ingredients.forEach(ing => {
    if (ing.classification) {
      allClassificationStats[ing.classification] = (allClassificationStats[ing.classification] || 0) + 1;
    }
    if (ing.classification === classification && ing.category) {
      const catName = ing.category.trim();
      allCategoryStats[catName] = (allCategoryStats[catName] || 0) + 1;
    }
  });
  console.log('[extractCategoriesFromArray] 所有原料的分类统计:', allClassificationStats);
  console.log('[extractCategoriesFromArray] 该分类下的类别统计:', allCategoryStats);
  
  // 提取该分类下的所有唯一类别
  const categorySet = new Set();
  const categoryMap = new Map(); // 用于存储 category -> { id, category, classification }
  let processedCount = 0;
  let categoryIndex = 0; // 用于生成唯一的ID
  
  ingredients.forEach((ing, index) => {
    // 检查分类是否匹配
    if (ing.classification === classification) {
      processedCount++;
      if (ing.category && ing.category.trim()) {
        const categoryName = ing.category.trim();
        if (!categorySet.has(categoryName)) {
          categorySet.add(categoryName);
          categoryIndex++;
          // 创建一个类似API返回格式的对象（使用负数作为临时ID，因为这是从本地数据提取的）
          categoryMap.set(categoryName, {
            id: -categoryIndex, // 使用递增的负数ID，避免与真实ID冲突
            category: categoryName,
            classification: ing.classification
          });
          console.log('[extractCategoriesFromArray] 发现新分类:', categoryName, '来自原料:', ing.id || index, ing.name || '', '完整数据:', JSON.stringify(ing));
        }
      } else {
        console.log('[extractCategoriesFromArray] 原料', ing.id || index, '没有category字段，完整数据:', JSON.stringify(ing));
      }
    } else {
      // 调试：记录不匹配的原料（只在需要时记录，避免日志过多）
      if (ing.classification && index < 10) { // 只记录前10个不匹配的，避免日志过多
        console.log('[extractCategoriesFromArray] 原料', ing.id || index, '分类不匹配:', ing.classification, '期望:', classification, '类别:', ing.category);
      }
    }
  });
  
  console.log('[extractCategoriesFromArray] 处理了', processedCount, '个匹配分类的原料，找到', categoryMap.size, '个唯一分类');
  console.log('[extractCategoriesFromArray] 提取到的分类列表:', Array.from(categoryMap.keys()));
  
  // 转换为数组并按类别名称排序
  const categories = Array.from(categoryMap.values()).sort((a, b) => {
    return a.category.localeCompare(b.category, 'zh-CN');
  });
  
  console.log('[extractCategoriesFromArray] 排序后的分类:', categories.map(c => c.category));
  
  return categories;
}

// 加载分类使用统计
async function loadCategoryUsageStats(classification) {
  if (!backendState.token) {
    return [];
  }
  
  try {
    const params = new URLSearchParams();
    params.append('classification', classification);
    
    const response = await backendRequest(`/api/v1/ingredient-categories/usage?${params.toString()}`, {
      method: 'GET'
    });
    
    const data = response?.data || response;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // 404/400/484错误时，静默失败，不显示任何错误（可能是API还未完全实现）
    const errorMessage = error.message || '';
    if (errorMessage.includes('404') || errorMessage.includes('Not Found') || 
        errorMessage.includes('400') || errorMessage.includes('484') ||
        errorMessage.includes('Resource not found')) {
      // 完全静默，不输出任何日志
      return [];
    } else {
      // 其他错误才显示错误信息
      console.warn('加载分类统计失败:', error);
      return [];
    }
  }
}

// 打开分类管理弹窗
async function openCategoryManagement() {
  const card = $('category-management-card');
  if (!card) return;
  
  currentCategoryClassification = '食材';
  card.style.display = 'block';
  
  // 更新标签页状态
  updateCategoryTabs();
  
  // 加载分类数据
  await loadAndRenderCategories();
}

// 关闭分类管理弹窗
function closeCategoryManagement() {
  const card = $('category-management-card');
  if (card) {
    card.style.display = 'none';
  }
}

// 更新标签页状态
function updateCategoryTabs() {
  document.querySelectorAll('.category-tab-btn').forEach(btn => {
    const classification = btn.dataset.classification;
    if (classification === currentCategoryClassification) {
      btn.style.borderBottomColor = 'var(--primary)';
      btn.style.color = 'var(--primary)';
    } else {
      btn.style.borderBottomColor = 'transparent';
      btn.style.color = '';
    }
  });
  
  const displayEl = $('current-classification-display');
  if (displayEl) {
    displayEl.textContent = currentCategoryClassification;
  }
}

// 切换分类标签页
async function switchCategoryTab(classification) {
  currentCategoryClassification = classification;
  updateCategoryTabs();
  await loadAndRenderCategories();
}

// 加载并渲染分类列表
async function loadAndRenderCategories() {
  const listEl = $('category-list-manage');
  const statsEl = $('category-stats');
  const searchInput = $('category-search-input');
  
  if (!listEl) return;
  
  listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">加载中...</div>';
  
  try {
    // 加载分类列表
    console.log('[loadAndRenderCategories] 开始加载分类，classification:', currentCategoryClassification);
    let categories = [];
    try {
      categories = await loadCategoriesFromBackend(currentCategoryClassification);
      console.log('[loadAndRenderCategories] API返回', categories.length, '个分类，类型:', typeof categories, '是否为数组:', Array.isArray(categories));
      console.log('[loadAndRenderCategories] 分类详情:', JSON.stringify(categories, null, 2));
    } catch (error) {
      console.error('[loadAndRenderCategories] 加载分类失败，尝试从store.ingredients提取:', error);
      // 如果加载失败，直接尝试从store.ingredients提取
      categories = await extractCategoriesFromIngredients(currentCategoryClassification);
      console.log('[loadAndRenderCategories] 从store.ingredients提取到', categories.length, '个分类，类型:', typeof categories, '是否为数组:', Array.isArray(categories));
      console.log('[loadAndRenderCategories] 提取的分类详情:', JSON.stringify(categories, null, 2));
    }
    
    // 确保categories是数组
    if (!Array.isArray(categories)) {
      console.warn('[loadAndRenderCategories] categories不是数组，转换为数组:', categories);
      if (categories && typeof categories === 'object') {
        categories = Object.values(categories);
      } else {
        categories = [];
      }
    }
    
    // 确保每个分类都是对象格式
    console.log('[loadAndRenderCategories] 规范化前，categories数量:', categories.length, 'categories内容:', JSON.stringify(categories, null, 2));
    categories = categories.map((cat, index) => {
      if (typeof cat === 'string') {
        console.warn('[loadAndRenderCategories] 发现字符串分类，转换为对象:', cat);
        return { id: -(index + 1), category: cat, classification: currentCategoryClassification };
      }
      if (typeof cat === 'object' && cat !== null) {
        // 确保有必要的属性
        if (!cat.category && cat.name) {
          console.log('[loadAndRenderCategories] 分类对象没有category属性，使用name:', cat.name);
          cat.category = cat.name;
        }
        if (!cat.category) {
          console.warn('[loadAndRenderCategories] 分类对象既没有category也没有name属性:', cat, '对象键:', Object.keys(cat));
          return null;
        }
        if (!cat.id) {
          cat.id = -(index + 1);
        }
        if (!cat.classification) {
          cat.classification = currentCategoryClassification;
        }
        return cat;
      }
      console.warn('[loadAndRenderCategories] 发现无效的分类数据:', cat, '类型:', typeof cat);
      return null;
    }).filter(cat => cat !== null);
    
    console.log('[loadAndRenderCategories] 规范化后', categories.length, '个分类:', JSON.stringify(categories, null, 2));
    
    categoryManagementData[currentCategoryClassification] = categories;
    
    // 加载使用统计
    const stats = await loadCategoryUsageStats(currentCategoryClassification);
    const statsMap = {};
    stats.forEach(stat => {
      statsMap[stat.category] = stat.ingredientCount || 0;
    });
    
    // 如果统计数据为空，从store.ingredients中计算使用统计
    if (stats.length === 0) {
      // 尝试加载所有原料数据来计算统计
      try {
        const response = await backendRequest('/api/v1/ingredients?pageSize=10000');
        const allIngredients = response.items || [];
        
        categories.forEach(cat => {
          if (!statsMap[cat.category]) {
            const count = allIngredients.filter(ing => 
              ing.classification === currentCategoryClassification && 
              ing.category === cat.category
            ).length;
            statsMap[cat.category] = count;
          }
        });
      } catch (error) {
        // 如果加载失败，使用现有的store.ingredients
        if (store.ingredients && store.ingredients.length > 0) {
          categories.forEach(cat => {
            if (!statsMap[cat.category]) {
              const count = store.ingredients.filter(ing => 
                ing.classification === currentCategoryClassification && 
                ing.category === cat.category
              ).length;
              statsMap[cat.category] = count;
            }
          });
        }
      }
    }
    
    // 应用搜索过滤
    const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
    console.log('[loadAndRenderCategories] 搜索文本:', searchText, 'categories类型:', typeof categories, '是否为数组:', Array.isArray(categories), 'categories内容:', categories);
    
    // 确保categories是数组且每个元素都有category属性
    const validCategories = categories.map(cat => {
      // 如果cat是字符串，转换为对象
      if (typeof cat === 'string') {
        console.warn('[loadAndRenderCategories] 发现字符串类型的分类，转换为对象:', cat);
        return { id: -Date.now(), category: cat, classification: currentCategoryClassification };
      }
      // 如果cat是对象但没有category属性，尝试使用name或其他属性
      if (typeof cat === 'object' && cat !== null) {
        if (!cat.category && cat.name) {
          cat.category = cat.name;
        }
        if (!cat.category) {
          console.warn('[loadAndRenderCategories] 发现没有category属性的分类对象:', cat);
          return null;
        }
        return cat;
      }
      console.warn('[loadAndRenderCategories] 发现无效的分类数据:', cat);
      return null;
    }).filter(cat => cat !== null);
    
    console.log('[loadAndRenderCategories] 有效分类数量:', validCategories.length, '有效分类:', validCategories);
    
    const filtered = validCategories.filter(cat => {
      if (!searchText) return true;
      const categoryName = cat.category || cat;
      if (typeof categoryName !== 'string') {
        console.warn('[loadAndRenderCategories] 分类名称不是字符串:', categoryName, 'cat:', cat);
        return false;
      }
      return categoryName.toLowerCase().includes(searchText);
    });
    
    // 渲染分类列表
    console.log('[loadAndRenderCategories] 过滤后', filtered.length, '个分类', 'filtered内容:', JSON.stringify(filtered, null, 2));
    if (filtered.length === 0) {
      console.warn('[loadAndRenderCategories] 没有分类数据可显示，categories:', categories, 'validCategories:', validCategories, 'filtered:', filtered);
      listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">暂无分类数据</div>';
      if (statsEl) {
        statsEl.innerHTML = '共 0 个分类，0 个原料正在使用';
      }
    } else {
      console.log('[loadAndRenderCategories] 开始渲染', filtered.length, '个分类到列表');
      listEl.innerHTML = filtered.map(cat => {
        const usageCount = statsMap[cat.category] || 0;
        const usageText = usageCount > 0 ? `（${usageCount}个原料）` : '';
        // 包材分类不显示"管理项目"按钮
        const isPackaging = currentCategoryClassification === '包材';
        const manageItemsBtn = isPackaging ? '' : `<button class="btn small" data-manage-items="${cat.id}" style="font-size:12px; padding:4px 12px; background:#2196F3; color:white;">管理项目</button>`;
        return `
          <div class="category-item-row" data-category-id="${cat.id}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:6px; background:white;">
            <div style="flex:1; display:flex; align-items:center; gap:8px;">
              <strong class="category-name-display" style="display:inline-block; min-width:100px;">${escapeHtml(cat.category)}</strong>
              <input type="text" class="category-name-edit" value="${escapeHtml(cat.category)}" style="display:none; flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:14px;" />
              <span style="color:var(--text-secondary); font-size:12px;">${usageText}</span>
            </div>
            <div style="display:flex; gap:6px;">
              ${manageItemsBtn}
              <button class="btn small" data-edit-category="${cat.id}" data-save-category="${cat.id}" style="font-size:12px; padding:4px 12px;">编辑</button>
              <button class="btn small" data-delete-category="${cat.id}" style="font-size:12px; padding:4px 12px; background:#f44336; color:white;" ${usageCount > 0 ? 'disabled title="该分类正在使用中，无法删除"' : ''}>删除</button>
            </div>
          </div>
        `;
      }).join('');
      
      // 绑定管理项目按钮事件
      listEl.querySelectorAll('[data-manage-items]').forEach(btn => {
        btn.addEventListener('click', () => {
          const categoryId = Number(btn.dataset.manageItems);
          // 使用filtered而不是categories，因为filtered是实际显示的分类
          const category = filtered.find(c => c.id === categoryId) || categories.find(c => c.id === categoryId);
          if (category) {
            openItemManagement(categoryId, category.category);
          }
        });
      });
      
      // 绑定编辑按钮事件（内联编辑）
      listEl.querySelectorAll('[data-edit-category]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.editCategory);
          const row = btn.closest('.category-item-row');
          const displayEl = row.querySelector('.category-name-display');
          const editEl = row.querySelector('.category-name-edit');
          const saveBtn = row.querySelector('[data-save-category]');
          
          if (displayEl.style.display !== 'none') {
            // 进入编辑模式
            displayEl.style.display = 'none';
            editEl.style.display = 'block';
            saveBtn.textContent = '保存';
            editEl.focus();
            editEl.select();
          } else {
            // 保存模式
            const newName = editEl.value.trim();
            if (!newName) {
              alert('分类名称不能为空');
              return;
            }
            if (newName === displayEl.textContent.trim()) {
              // 没有修改，取消编辑
              displayEl.style.display = 'inline-block';
              editEl.style.display = 'none';
              saveBtn.textContent = '编辑';
            } else {
              // 保存修改
              saveCategoryInline(id, newName, displayEl, editEl, saveBtn);
            }
          }
        });
      });
      
      listEl.querySelectorAll('[data-delete-category]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.dataset.deleteCategory);
          // 使用filtered而不是categories，因为filtered是实际显示的分类
          const category = filtered.find(c => c.id === id);
          if (category) {
            await deleteCategory(id, category.category);
          }
        });
      });
    }
    
    // 更新统计信息
    if (statsEl) {
      // 使用filtered.length而不是categories.length，因为filtered是实际显示的分类
      const totalCategories = filtered.length;
      const totalUsage = Object.values(statsMap).reduce((sum, count) => sum + count, 0);
      console.log('[loadAndRenderCategories] 更新统计信息：', totalCategories, '个分类，', totalUsage, '个原料正在使用');
      statsEl.innerHTML = `共 ${totalCategories} 个分类，${totalUsage} 个原料正在使用`;
    }
  } catch (error) {
    // 404/400/484错误时静默处理，显示空列表
    const errorMessage = error.message || '';
    if (errorMessage.includes('404') || errorMessage.includes('Not Found') || 
        errorMessage.includes('400') || errorMessage.includes('484') ||
        errorMessage.includes('Resource not found')) {
      console.log('分类API未找到，显示空列表');
      listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">暂无分类数据</div>';
      if (statsEl) {
        statsEl.innerHTML = '共 0 个分类，0 个原料正在使用';
      }
    } else {
      // 其他错误才显示错误信息
      console.error('加载分类失败:', error);
      listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#f44336;">加载失败：' + escapeHtml(error.message) + '</div>';
    }
  }
}

// 添加分类
async function addCategory() {
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  // 创建输入对话框
  const dialog = document.createElement('div');
  dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10002; display: flex; align-items: center; justify-content: center;';
  
  const content = document.createElement('div');
  content.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;';
  content.innerHTML = `
    <h3 style="margin-top: 0;">添加分类</h3>
    <p style="margin: 10px 0; color: var(--text-secondary);">当前分类体系：<strong>${escapeHtml(currentCategoryClassification)}</strong></p>
    <label style="display: block; margin: 10px 0;">
      分类名称：
      <input type="text" id="add-category-input" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid var(--border); border-radius: 4px; font-size: 14px;" placeholder="请输入分类名称" autofocus />
    </label>
    <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
      <button id="add-category-cancel-btn" class="btn ghost">取消</button>
      <button id="add-category-confirm-btn" class="btn primary">确定</button>
    </div>
  `;
  
  dialog.appendChild(content);
  document.body.appendChild(dialog);
  
  const inputEl = content.querySelector('#add-category-input');
  inputEl.focus();
  
  // 绑定事件
  const cancelBtn = content.querySelector('#add-category-cancel-btn');
  const confirmBtn = content.querySelector('#add-category-confirm-btn');
  
  const closeDialog = () => {
    document.body.removeChild(dialog);
  };
  
  cancelBtn.addEventListener('click', closeDialog);
  
  // 按ESC键关闭
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
  
  // 按Enter键确认
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    }
  });
  
  confirmBtn.addEventListener('click', async () => {
    const categoryName = inputEl.value.trim();
    if (!categoryName) {
      alert('请输入分类名称');
      inputEl.focus();
      return;
    }
    
    try {
      await backendRequest('/api/v1/ingredient-categories', {
        method: 'POST',
        body: {
          classification: currentCategoryClassification,
          category: categoryName
        }
      });
      
      closeDialog();
      document.removeEventListener('keydown', handleEsc);
      alert('添加成功！');
      await loadAndRenderCategories();
    } catch (error) {
      console.error('添加分类失败:', error);
      alert('添加失败：' + (error.message || '未知错误'));
      inputEl.focus();
    }
  });
}

// 内联保存分类
async function saveCategoryInline(id, newName, displayEl, editEl, saveBtn) {
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  try {
    await backendRequest(`/api/v1/ingredient-categories/${id}`, {
      method: 'PUT',
      body: {
        category: newName
      }
    });
    
    displayEl.textContent = newName;
    displayEl.style.display = 'inline-block';
    editEl.style.display = 'none';
    saveBtn.textContent = '编辑';
    
    // 重新加载列表以更新数据
    await loadAndRenderCategories();
  } catch (error) {
    console.error('更新分类失败:', error);
    alert('更新失败：' + (error.message || '未知错误'));
    // 恢复原值
    editEl.value = displayEl.textContent;
  }
}

// 编辑分类（保留用于向后兼容）
function editCategory(category) {
  const newName = prompt('请输入新的分类名称：', category.category);
  if (!newName || !newName.trim() || newName.trim() === category.category) return;
  
  updateCategory(category.id, newName.trim());
}

// 更新分类
async function updateCategory(id, newCategoryName) {
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  try {
    await backendRequest(`/api/v1/ingredient-categories/${id}`, {
      method: 'PUT',
      body: {
        category: newCategoryName
      }
    });
    
    alert('更新成功！');
    await loadAndRenderCategories();
  } catch (error) {
    console.error('更新分类失败:', error);
    alert('更新失败：' + (error.message || '未知错误'));
  }
}

// 删除分类
async function deleteCategory(id, categoryName) {
  if (!confirm(`确定要删除分类"${categoryName}"吗？\n\n注意：如果该分类下有原料正在使用，将无法删除。`)) {
    return;
  }
  
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  try {
    await backendRequest(`/api/v1/ingredient-categories/${id}`, {
      method: 'DELETE'
    });
    
    alert('删除成功！');
    await loadAndRenderCategories();
  } catch (error) {
    console.error('删除分类失败:', error);
    const errorMsg = error.message || '未知错误';
    if (errorMsg.includes('using') || errorMsg.includes('使用')) {
      alert('删除失败：该分类下有原料正在使用，无法删除。');
    } else {
      alert('删除失败：' + errorMsg);
    }
  }
}

// 导入预设分类
async function importPresetCategories() {
  if (!confirm(`确定要导入"${currentCategoryClassification}"的预设分类吗？\n\n注意：已存在的分类将被跳过。`)) {
    return;
  }
  
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  const presetCategories = PRESET_CATEGORIES[currentCategoryClassification] || [];
  if (presetCategories.length === 0) {
    alert('该分类暂无预设分类数据');
    return;
  }
  
  try {
    const categories = presetCategories.map((cat, index) => ({
      classification: currentCategoryClassification,
      category: cat,
      displayOrder: index
    }));
    
    const response = await backendRequest('/api/v1/ingredient-categories/import-preset', {
      method: 'POST',
      body: { categories }
    });
    
    const data = response?.data || response;
    const imported = data.imported || 0;
    
    alert(`导入完成！成功导入 ${imported} 个分类。`);
    await loadAndRenderCategories();
  } catch (error) {
    console.error('导入预设分类失败:', error);
    alert('导入失败：' + (error.message || '未知错误'));
  }
}

// ========== 项目管理模块 ==========

// 当前管理的分类ID和名称
let currentItemCategoryId = null;
let currentItemCategoryName = null;

// 加载项目列表
async function loadItemsFromBackend(categoryId) {
  if (!backendState.token) {
    console.warn('未登录，无法加载项目');
    return [];
  }
  
  try {
    const params = new URLSearchParams();
    if (categoryId) {
      params.append('categoryId', categoryId);
    }
    params.append('pageSize', '1000');
    
    const response = await backendRequest(`/api/v1/ingredient-items?${params.toString()}`, {
      method: 'GET'
    });
    
    const data = response?.data || response;
    const items = Array.isArray(data) ? data : (data.items || []);
    return items;
  } catch (error) {
    console.error('加载项目失败:', error);
    return [];
  }
}

// 加载项目使用统计
async function loadItemUsageStats(categoryId) {
  if (!backendState.token) {
    return [];
  }
  
  try {
    const params = new URLSearchParams();
    params.append('categoryId', categoryId);
    
    const response = await backendRequest(`/api/v1/ingredient-items/usage?${params.toString()}`, {
      method: 'GET'
    });
    
    const data = response?.data || response;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('加载项目统计失败:', error);
    return [];
  }
}

// 打开项目管理弹窗
async function openItemManagement(categoryId, categoryName) {
  const card = $('item-management-card');
  if (!card) return;
  
  currentItemCategoryId = categoryId;
  currentItemCategoryName = categoryName;
  
  const titleEl = $('item-management-title');
  const categoryDisplayEl = $('current-category-display');
  
  if (titleEl) titleEl.textContent = `项目管理 - ${categoryName}`;
  if (categoryDisplayEl) categoryDisplayEl.textContent = categoryName;
  
  card.style.display = 'block';
  
  // 加载项目数据
  await loadAndRenderItems();
}

// 关闭项目管理弹窗
function closeItemManagement() {
  const card = $('item-management-card');
  if (card) {
    card.style.display = 'none';
  }
  currentItemCategoryId = null;
  currentItemCategoryName = null;
}

// 加载并渲染项目列表
async function loadAndRenderItems() {
  const listEl = $('item-list-manage');
  const statsEl = $('item-stats');
  const searchInput = $('item-search-input');
  
  if (!listEl || !currentItemCategoryId) return;
  
  listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">加载中...</div>';
  
  try {
    // 加载项目列表
    const items = await loadItemsFromBackend(currentItemCategoryId);
    
    // 加载使用统计
    const stats = await loadItemUsageStats(currentItemCategoryId);
    const statsMap = {};
    stats.forEach(stat => {
      statsMap[stat.name] = stat.ingredientCount || 0;
    });
    
    // 应用搜索过滤
    const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filtered = items.filter(item => {
      if (!searchText) return true;
      return item.name.toLowerCase().includes(searchText);
    });
    
    // 渲染项目列表
    if (filtered.length === 0) {
      listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">暂无项目数据</div>';
    } else {
      listEl.innerHTML = filtered.map(item => {
        const usageCount = statsMap[item.name] || 0;
        const usageText = usageCount > 0 ? `（${usageCount}个原料）` : '';
        return `
          <div class="item-item-row" data-item-id="${item.id}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:6px; background:white;">
            <div style="flex:1; display:flex; align-items:center; gap:8px;">
              <strong class="item-name-display" style="display:inline-block; min-width:100px;">${escapeHtml(item.name)}</strong>
              <input type="text" class="item-name-edit" value="${escapeHtml(item.name)}" style="display:none; flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:14px;" />
              <span style="color:var(--text-secondary); font-size:12px;">${usageText}</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn small" data-move-item="${item.id}" style="font-size:12px; padding:4px 12px; background:#FF9800; color:white;">移动到</button>
              <button class="btn small" data-edit-item="${item.id}" data-save-item="${item.id}" style="font-size:12px; padding:4px 12px;">编辑</button>
              <button class="btn small" data-delete-item="${item.id}" style="font-size:12px; padding:4px 12px; background:#f44336; color:white;" ${usageCount > 0 ? 'disabled title="该项目正在使用中，无法删除"' : ''}>删除</button>
            </div>
          </div>
        `;
      }).join('');
      
      // 绑定移动到按钮事件
      listEl.querySelectorAll('[data-move-item]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.moveItem);
          const item = items.find(i => i.id === id);
          if (item) {
            moveItemToCategory(id, item.name);
          }
        });
      });
      
      // 绑定编辑按钮事件（内联编辑）
      listEl.querySelectorAll('[data-edit-item]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.editItem);
          const row = btn.closest('.item-item-row');
          const displayEl = row.querySelector('.item-name-display');
          const editEl = row.querySelector('.item-name-edit');
          const saveBtn = row.querySelector('[data-save-item]');
          
          if (displayEl.style.display !== 'none') {
            // 进入编辑模式
            displayEl.style.display = 'none';
            editEl.style.display = 'block';
            saveBtn.textContent = '保存';
            editEl.focus();
            editEl.select();
          } else {
            // 保存模式
            const newName = editEl.value.trim();
            if (!newName) {
              alert('项目名称不能为空');
              return;
            }
            if (newName === displayEl.textContent.trim()) {
              // 没有修改，取消编辑
              displayEl.style.display = 'inline-block';
              editEl.style.display = 'none';
              saveBtn.textContent = '编辑';
            } else {
              // 保存修改
              saveItemInline(id, newName, displayEl, editEl, saveBtn);
            }
          }
        });
      });
      
      listEl.querySelectorAll('[data-delete-item]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.dataset.deleteItem);
          const item = items.find(i => i.id === id);
          if (item) {
            await deleteItemById(id, item.name);
          }
        });
      });
    }
    
    // 更新统计信息
    if (statsEl) {
      const totalItems = items.length;
      const totalUsage = Object.values(statsMap).reduce((sum, count) => sum + count, 0);
      statsEl.innerHTML = `共 ${totalItems} 个项目，${totalUsage} 个原料正在使用`;
    }
  } catch (error) {
    console.error('加载项目失败:', error);
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#f44336;">加载失败：' + escapeHtml(error.message) + '</div>';
  }
}

// 添加项目
async function addItem() {
  const itemName = prompt('请输入项目名称：');
  if (!itemName || !itemName.trim()) return;
  
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  if (!currentItemCategoryId) {
    alert('请先选择分类');
    return;
  }
  
  try {
    await backendRequest('/api/v1/ingredient-items', {
      method: 'POST',
      body: {
        categoryId: currentItemCategoryId,
        name: itemName.trim()
      }
    });
    
    alert('添加成功！');
    await loadAndRenderItems();
  } catch (error) {
    console.error('添加项目失败:', error);
    alert('添加失败：' + (error.message || '未知错误'));
  }
}

// 内联保存项目
async function saveItemInline(id, newName, displayEl, editEl, saveBtn) {
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  try {
    await backendRequest(`/api/v1/ingredient-items/${id}`, {
      method: 'PUT',
      body: {
        name: newName
      }
    });
    
    displayEl.textContent = newName;
    displayEl.style.display = 'inline-block';
    editEl.style.display = 'none';
    saveBtn.textContent = '编辑';
    
    // 重新加载列表以更新数据
    await loadAndRenderItems();
  } catch (error) {
    console.error('更新项目失败:', error);
    alert('更新失败：' + (error.message || '未知错误'));
    // 恢复原值
    editEl.value = displayEl.textContent;
  }
}

// 移动项目到其他分类
async function moveItemToCategory(itemId, itemName) {
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  try {
    // 加载所有分类（当前分类体系下的）
    const allCategories = await loadCategoriesFromBackend(currentCategoryClassification);
    
    if (allCategories.length === 0) {
      alert('没有可用的分类');
      return;
    }
    
    // 创建选择对话框
    const categoryOptions = allCategories
      .filter(cat => cat.id !== currentItemCategoryId) // 排除当前分类
      .map(cat => `<option value="${cat.id}">${escapeHtml(cat.category)}</option>`)
      .join('');
    
    if (!categoryOptions) {
      alert('当前分类体系下没有其他分类可以移动');
      return;
    }
    
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10002; display: flex; align-items: center; justify-content: center;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;';
    content.innerHTML = `
      <h3 style="margin-top: 0;">移动到其他分类</h3>
      <p style="margin: 10px 0;">项目：<strong>${escapeHtml(itemName)}</strong></p>
      <label style="display: block; margin: 10px 0;">
        选择目标分类：
        <select id="move-target-category" style="width: 100%; padding: 8px; margin-top: 5px;">
          ${categoryOptions}
        </select>
      </label>
      <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
        <button id="move-cancel-btn" class="btn ghost">取消</button>
        <button id="move-confirm-btn" class="btn primary">确定</button>
      </div>
    `;
    
    dialog.appendChild(content);
    document.body.appendChild(dialog);
    
    // 绑定事件
    content.querySelector('#move-cancel-btn').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    content.querySelector('#move-confirm-btn').addEventListener('click', async () => {
      const targetCategoryId = Number(content.querySelector('#move-target-category').value);
      if (!targetCategoryId) {
        alert('请选择目标分类');
        return;
      }
      
      try {
        await backendRequest(`/api/v1/ingredient-items/${itemId}`, {
          method: 'PUT',
          body: {
            categoryId: targetCategoryId
          }
        });
        
        document.body.removeChild(dialog);
        alert('移动成功！');
        await loadAndRenderItems();
      } catch (error) {
        console.error('移动项目失败:', error);
        alert('移动失败：' + (error.message || '未知错误'));
      }
    });
  } catch (error) {
    // 404/400/484错误时静默处理
    const errorMessage = error.message || '';
    if (errorMessage.includes('404') || errorMessage.includes('Not Found') || 
        errorMessage.includes('400') || errorMessage.includes('484') ||
        errorMessage.includes('Resource not found')) {
      console.log('分类API未找到，跳过移动操作');
      // 不显示错误，直接返回
      return;
    } else {
      // 其他错误才显示错误信息
      console.error('加载分类失败:', error);
      alert('加载分类失败：' + (error.message || '未知错误'));
    }
  }
}

// 编辑项目（保留用于向后兼容）
function editItem(item) {
  const newName = prompt('请输入新的项目名称：', item.name);
  if (!newName || !newName.trim() || newName.trim() === item.name) return;
  
  updateItemById(item.id, newName.trim());
}

// 更新项目
async function updateItemById(id, newItemName) {
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  try {
    await backendRequest(`/api/v1/ingredient-items/${id}`, {
      method: 'PUT',
      body: {
        name: newItemName
      }
    });
    
    alert('更新成功！');
    await loadAndRenderItems();
  } catch (error) {
    console.error('更新项目失败:', error);
    alert('更新失败：' + (error.message || '未知错误'));
  }
}

// 删除项目
async function deleteItemById(id, itemName) {
  if (!confirm(`确定要删除项目"${itemName}"吗？\n\n注意：如果该项目下有原料正在使用，将无法删除。`)) {
    return;
  }
  
  if (!backendState.token) {
    alert('请先登录');
    return;
  }
  
  try {
    await backendRequest(`/api/v1/ingredient-items/${id}`, {
      method: 'DELETE'
    });
    
    alert('删除成功！');
    await loadAndRenderItems();
  } catch (error) {
    console.error('删除项目失败:', error);
    const errorMsg = error.message || '未知错误';
    if (errorMsg.includes('using') || errorMsg.includes('使用')) {
      alert('删除失败：该项目下有原料正在使用，无法删除。');
    } else {
      alert('删除失败：' + errorMsg);
    }
  }
}

// 渲染类别管理列表（旧版本，保留用于向后兼容）
function renderCategoryManageList() {
  const listEl = $('category-list-manage-old');
  if (!listEl) return;
  
  listEl.innerHTML = INGREDIENT_CATEGORIES.map((cat, idx) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border:0.5px solid var(--border); border-radius:6px;">
      <span>${cat}</span>
      <button class="btn small" onclick="removeCategory(${idx})" style="font-size:12px;">删除</button>
    </div>
  `).join('');
}

// 删除类别
function removeCategory(index) {
  if (confirm(`确定要删除类别"${INGREDIENT_CATEGORIES[index]}"吗？`)) {
    INGREDIENT_CATEGORIES.splice(index, 1);
    populateCategorySelects();
    renderCategoryManageList();
  }
}

// 添加类别
// 旧版本的addCategory函数（已废弃，保留用于向后兼容）
function addCategoryOld() {
  const input = $('new-category-input');
  if (!input) return;
  const newCat = input.value.trim();
  if (!newCat) {
    alert('请输入类别名称');
    return;
  }
  if (INGREDIENT_CATEGORIES.includes(newCat)) {
    alert('该类别已存在');
    return;
  }
  INGREDIENT_CATEGORIES.push(newCat);
  INGREDIENT_CATEGORIES.sort();
  populateCategorySelects();
  renderCategoryManageList();
  input.value = '';
}

// 渲染项目名称管理列表
function renderNameManageList() {
  const listEl = $('name-list-manage');
  if (!listEl) return;
  
  const uniqueNames = [...new Set(store.ingredients.map(ing => ing.name).filter(Boolean))].sort();
  
  if (uniqueNames.length === 0) {
    listEl.innerHTML = '<div class="muted" style="text-align:center; padding:20px;">暂无项目数据</div>';
    return;
  }
  
  listEl.innerHTML = uniqueNames.map((name, idx) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border:0.5px solid var(--border); border-radius:6px; cursor:pointer; transition:background 0.2s;" 
         data-name="${name}"
         onmouseover="this.style.background='var(--bg-secondary)'" 
         onmouseout="this.style.background=''">
      <span>${name}</span>
      <span style="font-size:12px; color:var(--text-secondary);">${store.ingredients.filter(ing => ing.name === name).length} 条</span>
    </div>
  `).join('');
  
  // 使用事件委托避免字符串转义问题
  listEl.querySelectorAll('[data-name]').forEach(div => {
    div.addEventListener('click', () => {
      const name = div.getAttribute('data-name');
      if (name) selectNameForForm(name);
    });
  });
}
// 选择项目名称填入表单
function selectNameForForm(name) {
  const nameEl = $('i-name');
  if (nameEl && nameEl.tagName === 'SELECT' && nameEl.options) {
    try {
      // 检查项目是否在下拉框中
      const optionExists = Array.from(nameEl.options).some(opt => opt.value === name);
      if (!optionExists) {
        // 如果不存在，添加一个选项
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        nameEl.appendChild(opt);
      }
      nameEl.value = name;
      autoGenerateCode(); // 自动生成编号
    } catch (err) {
      console.warn('选择项目名称失败:', err);
    }
  }
  // 关闭编辑对话框
  const editCard = $('edit-name-card');
  if (editCard) editCard.style.display = 'none';
  const input = $('new-name-input');
  if (input) input.value = '';
}

// 添加项目名称（输入新项目）
function addNameToForm() {
  const input = $('new-name-input');
  if (!input) return;
  const newName = input.value.trim();
  if (!newName) {
    alert('请输入项目名称');
    return;
  }
  // 直接将输入的值填入项目字段
  selectNameForForm(newName);
}
function setupIngredientsModule() {
  // 检查视图元素是否存在，如果不存在则延迟初始化
  const viewInventory = $('view-inventory');
  if (!viewInventory) {
    console.warn('[setupIngredientsModule] view-inventory 元素不存在，跳过初始化');
    return;
  }
  
  try {
    populateCategorySelects();
    populateUnitSelect();
  } catch (error) {
    console.error('[setupIngredientsModule] 初始化分类和单位选择失败:', error);
    // 继续执行其他初始化，不中断
  }
  
  const newBtn = $('btn-new-ingredient');
  if (newBtn) newBtn.addEventListener('click', () => openIngredientForm());
  
  // 管理分类按钮
  const manageCategoriesBtn = $('btn-manage-categories');
  if (manageCategoriesBtn) {
    manageCategoriesBtn.addEventListener('click', () => openCategoryManagement());
  }
  
  // 分类管理弹窗相关事件
  const closeCategoryManagementBtn = $('btn-close-category-management');
  if (closeCategoryManagementBtn) {
    closeCategoryManagementBtn.addEventListener('click', () => closeCategoryManagement());
  }
  
  // 标签页切换
  document.querySelectorAll('.category-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const classification = btn.dataset.classification;
      if (classification) {
        switchCategoryTab(classification);
      }
    });
  });
  
  // 添加分类按钮（使用新的对话框版本）
  const addCategoryBtn = $('btn-add-category');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', async () => {
      // 确保调用的是新的async版本
      await addCategory();
    });
  }
  
  // 导入预设分类按钮
  const importPresetBtn = $('btn-import-preset-categories');
  if (importPresetBtn) {
    importPresetBtn.addEventListener('click', () => importPresetCategories());
  }
  
  // 搜索输入框
  const categorySearchInput = $('category-search-input');
  if (categorySearchInput) {
    categorySearchInput.addEventListener('input', () => {
      loadAndRenderCategories();
    });
  }
  
  // 项目管理弹窗相关事件
  const closeItemManagementBtn = $('btn-close-item-management');
  if (closeItemManagementBtn) {
    closeItemManagementBtn.addEventListener('click', () => closeItemManagement());
  }
  
  // 添加项目按钮
  const addItemBtn = $('btn-add-item');
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => addItem());
  }
  
  // 项目搜索输入框
  const itemSearchInput = $('item-search-input');
  if (itemSearchInput) {
    itemSearchInput.addEventListener('input', () => {
      loadAndRenderItems();
    });
  }

  // 单位管理弹窗相关事件
  const manageUnitsBtn = $('btn-manage-units');
  if (manageUnitsBtn) {
    manageUnitsBtn.addEventListener('click', () => openUnitManagement());
  }
  const closeUnitManagementBtn = $('btn-close-unit-management');
  if (closeUnitManagementBtn) {
    closeUnitManagementBtn.addEventListener('click', () => closeUnitManagement());
  }
  const addUnitBtn = $('btn-add-unit');
  if (addUnitBtn) {
    addUnitBtn.addEventListener('click', () => addUnit());
  }
  
  // 原料分类变化时，动态加载类别列表
  const classificationSelect = $('i-classification');
  if (classificationSelect) {
    // 使用 once: false 确保可以多次触发，但先移除可能存在的旧监听器
    const handleClassificationChange = async function() {
      const classification = this.value;
      
      console.log('[Classification Change Event] Triggered, classification:', classification);
      
      // 更新字段显示/隐藏
      updateIngredientFieldsVisibility(classification);
      
      // 检查是否是编辑模式
      const card = $('ingredient-form-card');
      const currentId = $('ingredient-id')?.value;
      const isEditMode = (card && card.hasAttribute('data-editing')) || (currentId && currentId.trim() !== '');
      
      console.log('[Classification Change] classification:', classification, 'isEditMode:', isEditMode);
      
      // 使用统一的状态管理器更新显示/隐藏（单一入口）
      detailsSectionState.updateState({
        classification: classification,
        isEditMode: isEditMode
      });
      
      // 包材分类隐藏食材名称字段
      const nameLabel = $('i-name-label');
      const nameSelect = $('i-name');
      
      if (classification === '包材') {
        if (nameLabel) {
          nameLabel.style.display = 'none';
        }
        if (nameSelect) {
          nameSelect.innerHTML = '<option value="">包材无需选择食材名称</option>';
        }
      } else {
        if (nameLabel) {
          nameLabel.style.display = '';
        }
        if (nameSelect) {
          nameSelect.innerHTML = '<option value="">请先选择原料分类和类别</option>';
        }
      }
      
      if (classification) {
        await loadCategoriesForForm(classification);
      } else {
        const categorySelect = $('i-category');
        if (categorySelect) {
          categorySelect.innerHTML = '<option value="">请选择类别</option>';
        }
        // 分类为空时，隐藏所有分类特定字段
        updateIngredientFieldsVisibility('');
      }
      
      // 自动生成编号：如果分类和类别都已选择，就生成编号（特别是包材的情况）
      const category = $('i-category')?.value;
      if (classification && category) {
        setTimeout(() => autoGenerateCode(), 200);
      }
    };
    
    // 添加事件监听器（setupIngredientsModule 只在初始化时调用一次，不会重复添加）
    classificationSelect.addEventListener('change', handleClassificationChange);
    console.log('[setupIngredientsModule] Classification change event listener registered');
  } else {
    console.warn('[setupIngredientsModule] Classification select element not found!');
  }
  
  // 原料搜索输入框事件（第一行的搜索栏）
  const ingredientSearchInput = $('i-ingredient-search');
  if (ingredientSearchInput) {
    let ingredientSearchTimeout = null;
    
    ingredientSearchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      clearTimeout(ingredientSearchTimeout);
      ingredientSearchTimeout = setTimeout(() => {
        searchIngredientForForm(query);
      }, 300); // 防抖，300ms后搜索
    });
    
    ingredientSearchInput.addEventListener('focus', () => {
      const query = ingredientSearchInput.value;
      if (query && query.trim().length > 0) {
        searchIngredientForForm(query);
      }
    });
    
    // 点击外部关闭下拉框
    if (!document.hasIngredientFormSearchClickHandler) {
      document.addEventListener('click', (e) => {
        const dropdown = $('i-ingredient-search-dropdown');
        const searchInput = $('i-ingredient-search');
        if (dropdown && searchInput && !dropdown.contains(e.target) && e.target !== searchInput) {
          dropdown.style.display = 'none';
        }
      });
      document.hasIngredientFormSearchClickHandler = true;
    }
  }
  
  // 类别变化时，加载对应的食材名称下拉框选项
  const categoryEl = $('i-category');
  if (categoryEl) {
    categoryEl.addEventListener('change', async () => {
      const classification = $('i-classification')?.value;
      const category = categoryEl.value;
      if (classification && category && classification !== '包材') {
        await loadItemsForForm(classification, category, null);
      } else {
        const nameSelect = $('i-name');
        if (nameSelect) {
          nameSelect.innerHTML = '<option value="">请先选择原料分类和类别</option>';
        }
      }
      // 自动生成编号：如果分类和类别都已选择，就生成编号（特别是包材的情况）
      if (classification && category) {
        setTimeout(() => autoGenerateCode(), 100);
      } else {
        // 如果分类或类别为空，检查是否有食材名称，有的话也生成编号
        const nameEl = $('i-name');
        if (nameEl && nameEl.value) {
          setTimeout(() => autoGenerateCode(), 100);
        }
      }
    });
  }
  
  // 食材名称下拉框变化时自动生成编号
  const nameSelectEl = $('i-name');
  if (nameSelectEl) {
    nameSelectEl.addEventListener('change', () => {
      if (nameSelectEl.value) {
        setTimeout(() => autoGenerateCode(), 100);
      }
    });
  }
  
  const cancelBtn = $('btn-cancel-ingredient');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    const card = $('ingredient-form-card');
    if (card) card.style.display = 'none';
  });
  
  // 注意：类别变化事件已在上面绑定，这里不再重复绑定
  
  // 食材名称变化时自动生成编号（通过搜索选择后触发）
  const hiddenNameEl = $('i-name');
  if (hiddenNameEl) {
    // 使用MutationObserver监听value变化
    const observer = new MutationObserver(() => {
      if (hiddenNameEl.value) {
        setTimeout(() => autoGenerateCode(), 100);
      }
    });
    observer.observe(hiddenNameEl, { attributes: true, attributeFilter: ['value'] });
  }
  
  // 编辑类别按钮
  const editCategoryBtn = $('btn-edit-category');
  if (editCategoryBtn) {
    editCategoryBtn.addEventListener('click', () => {
      renderCategoryManageList();
      const card = $('edit-category-card');
      if (card) card.style.display = 'block';
    });
  }
  
  const cancelEditCategoryBtn = $('btn-cancel-edit-category');
  if (cancelEditCategoryBtn) {
    cancelEditCategoryBtn.addEventListener('click', () => {
      const card = $('edit-category-card');
      if (card) card.style.display = 'none';
    });
  }
  
  // 旧的添加类别按钮（保留用于向后兼容）
  const addCategoryBtnOld = $('btn-add-category-old');
  if (addCategoryBtnOld) {
    addCategoryBtnOld.addEventListener('click', () => {
      const newCategoryInput = $('new-category-input');
      if (newCategoryInput && newCategoryInput.value.trim()) {
        INGREDIENT_CATEGORIES.push(newCategoryInput.value.trim());
        populateCategorySelects();
        renderCategoryManageList();
        newCategoryInput.value = '';
      }
    });
    const newCategoryInput = $('new-category-input');
    if (newCategoryInput) {
      newCategoryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCategoryBtnOld.click();
        }
      });
    }
  }
  
  // 编辑项目按钮
  const editNameBtn = $('btn-edit-name');
  if (editNameBtn) {
    editNameBtn.addEventListener('click', () => {
      renderNameManageList();
      const card = $('edit-name-card');
      if (card) card.style.display = 'block';
    });
  }
  
  const cancelEditNameBtn = $('btn-cancel-edit-name');
  if (cancelEditNameBtn) {
    cancelEditNameBtn.addEventListener('click', () => {
      const card = $('edit-name-card');
      if (card) card.style.display = 'none';
    });
  }
  
  const addNameBtn = $('btn-add-name');
  if (addNameBtn) {
    addNameBtn.addEventListener('click', addNameToForm);
    const newNameInput = $('new-name-input');
    if (newNameInput) {
      newNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addNameToForm();
        }
      });
    }
  }
  
  // 品牌管理按钮
  const manageBrandsBtn = $('btn-manage-brands');
  if (manageBrandsBtn) {
    manageBrandsBtn.addEventListener('click', () => openBrandManagement());
  }
  
  // 采购渠道管理按钮
  const manageSourcesBtn = $('btn-manage-sources');
  if (manageSourcesBtn) {
    manageSourcesBtn.addEventListener('click', () => openSourceManagement());
  }
  
  // 品牌管理弹窗相关事件
  const closeBrandManagementBtn = $('btn-close-brand-management');
  if (closeBrandManagementBtn) {
    closeBrandManagementBtn.addEventListener('click', () => closeBrandManagement());
  }
  
  // 采购渠道管理弹窗相关事件
  const closeSourceManagementBtn = $('btn-close-source-management');
  if (closeSourceManagementBtn) {
    closeSourceManagementBtn.addEventListener('click', () => closeSourceManagement());
  }
  
  // 品牌搜索输入框
  const brandSearchInput = $('brand-search-input');
  if (brandSearchInput) {
    brandSearchInput.addEventListener('input', () => {
      loadAndRenderBrands();
    });
  }
  
  // 采购渠道搜索输入框
  const sourceSearchInput = $('source-search-input');
  if (sourceSearchInput) {
    sourceSearchInput.addEventListener('input', () => {
      loadAndRenderSources();
    });
  }
  
  // 添加品牌按钮
  const addBrandBtn = $('btn-add-brand');
  if (addBrandBtn) {
    addBrandBtn.addEventListener('click', () => addBrand());
  }
  
  // 添加采购渠道按钮
  const addSourceBtn = $('btn-add-source');
  if (addSourceBtn) {
    addSourceBtn.addEventListener('click', () => addSource());
  }
  
  // 所属科目管理按钮
  const manageSubjectBtn = $('btn-manage-subjects');
  if (manageSubjectBtn) {
    manageSubjectBtn.addEventListener('click', () => openSubjectManagement());
  }
  
  const closeSubjectManagementBtn = $('btn-close-subject-management');
  if (closeSubjectManagementBtn) {
    closeSubjectManagementBtn.addEventListener('click', () => closeSubjectManagement());
  }
  
  const subjectSearchInput = $('subject-search-input');
  if (subjectSearchInput) {
    subjectSearchInput.addEventListener('input', () => {
      loadAndRenderSubjects();
    });
  }
  
  const addSubjectBtn = $('btn-add-subject');
  if (addSubjectBtn) {
    addSubjectBtn.addEventListener('click', () => addSubject());
  }
  
  // 部位管理按钮
  const managePartBtn = $('btn-manage-parts');
  if (managePartBtn) {
    managePartBtn.addEventListener('click', () => openPartManagement());
  }
  
  const closePartManagementBtn = $('btn-close-part-management');
  if (closePartManagementBtn) {
    closePartManagementBtn.addEventListener('click', () => closePartManagement());
  }
  
  const partSearchInput = $('part-search-input');
  if (partSearchInput) {
    partSearchInput.addEventListener('input', () => {
      loadAndRenderParts();
    });
  }
  
  const addPartBtn = $('btn-add-part');
  if (addPartBtn) {
    addPartBtn.addEventListener('click', () => addPart());
  }
  
  // 产地类型管理按钮
  const manageOriginTypeBtn = $('btn-manage-origin-types');
  if (manageOriginTypeBtn) {
    manageOriginTypeBtn.addEventListener('click', () => openOriginTypeManagement());
  }
  
  const closeOriginTypeManagementBtn = $('btn-close-origin-type-management');
  if (closeOriginTypeManagementBtn) {
    closeOriginTypeManagementBtn.addEventListener('click', () => closeOriginTypeManagement());
  }
  
  const originTypeSearchInput = $('origin-type-search-input');
  if (originTypeSearchInput) {
    originTypeSearchInput.addEventListener('input', () => {
      loadAndRenderOriginTypes();
    });
  }
  
  const addOriginTypeBtn = $('btn-add-origin-type');
  if (addOriginTypeBtn) {
    addOriginTypeBtn.addEventListener('click', () => addOriginType());
  }
  
  // 主要营养素管理按钮
  const manageMainNutrientsBtn = $('btn-manage-main-nutrients');
  if (manageMainNutrientsBtn) {
    manageMainNutrientsBtn.addEventListener('click', () => openMainNutrientManagement());
  }
  
  const closeMainNutrientManagementBtn = $('btn-close-main-nutrient-management');
  if (closeMainNutrientManagementBtn) {
    closeMainNutrientManagementBtn.addEventListener('click', () => closeMainNutrientManagement());
  }
  
  const mainNutrientSearchInput = $('main-nutrient-search-input');
  if (mainNutrientSearchInput) {
    mainNutrientSearchInput.addEventListener('input', () => {
      loadAndRenderMainNutrients();
    });
  }
  
  const addMainNutrientBtn = $('btn-add-main-nutrient');
  if (addMainNutrientBtn) {
    addMainNutrientBtn.addEventListener('click', () => addMainNutrient());
  }
  
  // 初始化品牌和采购渠道数据
  initBrandsAndSources();
  // 初始化主要营养素数据
  initMainNutrients();
  
  // 初始化所属科目、部位、产地类型、主要营养素下拉框
  populateSubjectSelect();
  populatePartSelect();
  populateOriginTypeSelect();
  populateMainNutrientSelect();
  
  // 重新生成编号按钮
  const regenerateCodeBtn = $('btn-regenerate-code');
  if (regenerateCodeBtn) {
    regenerateCodeBtn.addEventListener('click', async () => {
      const classification = $('i-classification')?.value.trim();
      const category = $('i-category')?.value.trim();
      const ingredientId = $('ingredient-id')?.value;
      
      if (!classification || !category) {
        alert('请先选择原料分类和类别');
        return;
      }
      
      if (!confirm('确定要重新生成编号吗？新编号将按照新的编号规则生成。')) {
        return;
      }
      
      // 重新生成编号
      const newCode = await generateIngredientCode(classification, category, ingredientId || null);
      if (newCode) {
        $('i-code').value = newCode;
        console.log('[Regenerate Code] 新编号:', newCode);
      } else {
        alert('编号生成失败，请检查分类和类别是否正确');
      }
    });
  }
  
  const searchEl = $('ingredient-search');
  if (searchEl) searchEl.addEventListener('input', async () => {
    store.ingredientPage = 1;
    if (backendState.token) {
      await loadIngredientsFromBackend();
    } else {
      renderIngredientsList();
    }
  });
  
  // 类别筛选
  const categoryFilterEl = $('ingredient-category-filter');
  if (categoryFilterEl) categoryFilterEl.addEventListener('change', async () => {
    store.ingredientPage = 1;
    if (backendState.token) {
      await loadIngredientsFromBackend();
    } else {
      renderIngredientsList();
    }
  });
  
  // 所属科目筛选
  const subjectFilterEl = $('ingredient-subject-filter');
  if (subjectFilterEl) subjectFilterEl.addEventListener('change', async () => {
    store.ingredientPage = 1;
    if (backendState.token) {
      await loadIngredientsFromBackend();
    } else {
      renderIngredientsList();
    }
  });
  
  // 部位筛选
  const partFilterEl = $('ingredient-part-filter');
  if (partFilterEl) partFilterEl.addEventListener('change', async () => {
    store.ingredientPage = 1;
    if (backendState.token) {
      await loadIngredientsFromBackend();
    } else {
      renderIngredientsList();
    }
  });
  
  // 产地类型筛选
  const originTypeFilterEl = $('ingredient-origin-type-filter');
  if (originTypeFilterEl) originTypeFilterEl.addEventListener('change', async () => {
    store.ingredientPage = 1;
    if (backendState.token) {
      await loadIngredientsFromBackend();
    } else {
      renderIngredientsList();
    }
  });
  
  const prevBtn = $('ingredients-prev');
  if (prevBtn) prevBtn.addEventListener('click', async () => {
    if (store.ingredientPage > 1) {
      store.ingredientPage--;
      if (backendState.token) {
        await loadIngredientsFromBackend();  // 使用后端数据时，重新加载
      } else {
        renderIngredientsList();  // 本地数据只需要重新渲染
      }
    }
  });
  
  const nextBtn = $('ingredients-next');
  if (nextBtn) {
    // 移除旧的事件监听器（如果存在），避免重复绑定
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener('click', async () => {
      const { totalPages } = paginatedIngredients();
      console.log(`[分页] 点击下一页，当前页: ${store.ingredientPage}, 总页数: ${totalPages}`);
      if (store.ingredientPage < totalPages) {
        const oldPage = store.ingredientPage;
        store.ingredientPage++;
        console.log(`[分页] 页码从 ${oldPage} 增加到 ${store.ingredientPage}`);
        if (backendState.token) {
          await loadIngredientsFromBackend();  // 使用后端数据时，重新加载
        } else {
          renderIngredientsList();  // 本地数据只需要重新渲染
        }
      }
    });
  }
  
  // 价格自动计算
  const priceFields = ['i-cost', 'i-quantity', 'i-unit', 'i-ediblePortion', 'i-unitContent', 'i-nutrientUnit'];
  priceFields.forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', updateIngredientPriceFields);
  });
  
  // 单位字段变化时，更新标签文本
  const unitSelect = $('i-unit');
  if (unitSelect) {
    unitSelect.addEventListener('change', () => {
      updateUnitBasedLabels();
      updateIngredientPriceFields(); // 重新计算价格
    });
  }
  
  // 主要营养素字段变化时，更新标签文本（仅营养补充剂，改为 change 事件因为现在是 select）
  const mainNutrientEl = $('i-mainNutrient');
  if (mainNutrientEl) {
    mainNutrientEl.addEventListener('change', () => {
      updateUnitBasedLabels();
      updateIngredientPriceFields();
    });
  }
  
  // 营养素单位字段变化时，更新标签文本（仅营养补充剂）
  const nutrientUnitEl = $('i-nutrientUnit');
  if (nutrientUnitEl) {
    nutrientUnitEl.addEventListener('change', () => {
      updateUnitBasedLabels();
      updateIngredientPriceFields();
    });
  }
  
  // 表单提交
  const form = $('ingredient-form');
  if (form) {
    // 移除旧的事件监听器（如果存在），避免重复绑定
    // 通过克隆节点并替换来移除所有事件监听器
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // 重新获取表单元素（因为已经被替换）
    const formElement = $('ingredient-form');
    if (!formElement) {
      console.error('[setupIngredientsModule] 无法找到表单元素');
      return;
    }
    
    formElement.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!backendState.token) {
        alert('请先登录');
        return;
      }
      
      // 移除所有隐藏字段的 required 属性，避免表单验证错误
      const allRequiredFields = formElement.querySelectorAll('[required]');
      allRequiredFields.forEach(field => {
        const label = field.closest('label');
        if (label && label.style.display === 'none') {
          field.removeAttribute('required');
          field.required = false;
        }
      });
      
      const id = $('ingredient-id').value;
      const classification = $('i-classification') ? $('i-classification').value.trim() : '';
      const category = $('i-category').value.trim();
      const name = $('i-name').value.trim(); // 从隐藏字段获取
      
      // 验证必填项
      if (!classification) {
        alert('请选择原料分类');
        return;
      }
      if (!category) {
        alert('请选择类别');
        return;
      }
      // 包材不需要name，其他分类需要
      if (classification !== '包材' && !name) {
        alert('请搜索并选择食材名称');
        return;
      }
      
      // 确保详细信息区域正确显示（通过状态管理器统一管理）
      // 如果分类已选择，状态管理器应该已经处理了显示逻辑
      // 这里只需要确保状态同步即可
      const currentClassification = $('i-classification') ? $('i-classification').value.trim() : '';
      const currentId = $('ingredient-id')?.value;
      const isEditMode = currentId && currentId.trim() !== '';
      detailsSectionState.updateState({
        classification: currentClassification,
        isEditMode: isEditMode
      });
      
      const cost = Number($('i-cost').value) || 0;
      const quantity = Number($('i-quantity').value) || 0;
      const unit = $('i-unit').value || 'g';
      // 可食部从百分比转换为0-1的小数
      const ediblePortionPercent = Number($('i-ediblePortion').value) || 100;
      const ediblePortion = ediblePortionPercent / 100;
      
      // 自动生成编号（如果是新增且没有编号，或编辑时编号为空）
      // 所有分类都需要编号（包括包材）
      let code = $('i-code').value.trim();
      
      // 编辑模式：如果已有编号，保持编号不变（即使类别名称变化）
      if (id && code) {
        console.log('[Save Ingredient] 编辑模式，保持原有编号:', code);
      } else if (!code) {
        // 新增模式或编辑时编号为空，自动生成（包括包材）
        code = await generateIngredientCode(classification, category, id || null);
        if (code) {
          $('i-code').value = code;
          console.log('[Save Ingredient] 自动生成编号:', code);
        } else {
          alert('编号生成失败，请检查分类和类别是否正确');
          return;
        }
      }
      
      updateIngredientPriceFields();
      const pricePer500 = Number($('i-pricePer500').value) || 0;
      const ediblePricePer500 = Number($('i-ediblePricePer500').value) || 0;
      
      const sourceValue = $('i-source') ? $('i-source').value.trim() : '';
      console.log('[Save Ingredient] Source value from form:', sourceValue, 'element exists:', !!$('i-source'));
      
      // 根据分类获取新字段的值
      const subject = classification === '食材' ? ($('i-subject')?.value.trim() || null) : null;
      const part = classification === '食材' ? ($('i-part')?.value.trim() || null) : null;
      const originType = classification === '食材' ? ($('i-originType')?.value.trim() || null) : null;
      const model = $('i-model')?.value.trim() || null;
      
      // 安全获取营养补充剂字段（避免 undefined.trim() 错误）
      let mainNutrient = null;
      let unitContent = null;
      let nutrientUnit = null;
      let pricePer100NutrientUnit = null;
      
      if (classification === '营养补充剂') {
        const mainNutrientEl = $('i-mainNutrient');
        const unitContentEl = $('i-unitContent');
        const nutrientUnitEl = $('i-nutrientUnit');
        const pricePer100NutrientUnitEl = $('i-pricePer100NutrientUnit');
        
        mainNutrient = mainNutrientEl && mainNutrientEl.value ? mainNutrientEl.value.trim() || null : null;
        // 修复：unitContent 应该转换为数字，而不是字符串
        // 注意：0 是有效值，不应该被转换为 null
        unitContent = unitContentEl && unitContentEl.value 
          ? (Number(unitContentEl.value) || (unitContentEl.value.trim() === '0' ? 0 : null))
          : null;
        nutrientUnit = nutrientUnitEl && nutrientUnitEl.value ? nutrientUnitEl.value.trim() || null : null;
        // 修复：pricePer100NutrientUnit 的处理，确保 0 是有效值
        pricePer100NutrientUnit = pricePer100NutrientUnitEl && pricePer100NutrientUnitEl.value 
          ? (Number(pricePer100NutrientUnitEl.value) || (pricePer100NutrientUnitEl.value.trim() === '0' ? 0 : null))
          : null;
        
        // 调试日志
        console.log('[Save Ingredient] 营养补充剂字段值:', {
          mainNutrient,
          unitContent,
          nutrientUnit,
          pricePer100NutrientUnit,
          mainNutrientElExists: !!mainNutrientEl,
          nutrientUnitElExists: !!nutrientUnitEl
        });
      }
      
      const data = {
        code: code || '',
        category: category,
        name: classification === '包材' ? '' : name, // 包材不需要name
        brand: $('i-brand').value.trim() || null,
        source: sourceValue || '', // 采购渠道 - 使用空字符串而不是null，确保字段被保存
        cost: cost || null,
        quantity: quantity || null,
        unit: unit,
        pricePer500: pricePer500 || null,
        ediblePortion: ediblePortion,
        ediblePricePer500: ediblePricePer500 || null,
        weightPerUnit: $('i-weightPerUnit').value ? Number($('i-weightPerUnit').value) : null,
        classification: classification || null,
        description: $('i-description').value.trim() || null,
        mainFunction: $('i-mainFunction').value.trim() || null,
        // 新增字段
        subject: subject, // 所属科目（仅食材）
        part: part, // 部位（仅食材）
        originType: originType, // 产地类型（仅食材）
        model: model, // 型号（所有分类）
        mainNutrient: mainNutrient, // 主要营养素（仅营养补充剂）
        unitContent: unitContent, // 营养素含量/单位（仅营养补充剂）
        nutrientUnit: nutrientUnit, // 营养素单位（仅营养补充剂）
        pricePer100NutrientUnit: pricePer100NutrientUnit // 每100营养素单位价格（仅营养补充剂）
      };
      
      // 检查登录状态
      if (!backendState.token) {
        alert('登录已过期，请重新登录后再试。');
        clearBackendAuth();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      }
      
      try {
        console.log('[Save Ingredient] Saving data with source:', data.source, 'token exists:', !!backendState.token);
        console.log('[Save Ingredient] 营养补充剂相关字段:', {
          classification: data.classification,
          mainNutrient: data.mainNutrient,
          nutrientUnit: data.nutrientUnit,
          unitContent: data.unitContent,
          pricePer100NutrientUnit: data.pricePer100NutrientUnit
        });
        if (id && id.startsWith('ing_')) {
          // 编辑：使用后端ID
          const backendId = store.ingredients.find(x => x.id === id)?._backendId;
          if (backendId) {
            const response = await backendRequest(`/api/v1/ingredients/${backendId}`, {
              method: 'PUT',
              body: data
            });
            console.log('[Save Ingredient] Update response:', response);
            console.log('[Save Ingredient] Response source field:', response?.source, 'type:', typeof response?.source, 'full response:', JSON.stringify(response));
            
            // 检查响应是否包含错误
            if (response && response.message && (response.message.includes('Unauthorized') || response.message.includes('401'))) {
              throw new Error('登录已过期，请重新登录。');
            }
            
            alert('更新成功！');
          } else {
            throw new Error('无法找到原料的后端ID');
          }
        } else {
          // 新增
          const response = await backendRequest('/api/v1/ingredients', {
            method: 'POST',
            body: data
          });
          console.log('[Save Ingredient] Create response:', response);
          console.log('[Save Ingredient] Response source field:', response?.source, 'type:', typeof response?.source, 'full response:', JSON.stringify(response));
          alert('创建成功！');
        }
        
        // 重新加载列表（确保获取最新数据）
        console.log('[Save Ingredient] Reloading ingredient list...');
        try {
          await loadIngredientsFromBackend();
          console.log('[Save Ingredient] Reload complete');
        } catch (reloadError) {
          console.error('[Save Ingredient] Failed to reload ingredient list:', reloadError);
        }
        
        await loadAllIngredientsForFilters();
        
        // 关闭表单（不再自动重新打开）
        const card = $('ingredient-form-card');
        if (card) {
          card.style.display = 'none';
          console.log('[Save Ingredient] Form closed after save');
        }
        } catch (error) {
        console.error('保存原料失败:', error);
        
        // 如果是认证错误，提示用户重新登录
        if (error.message && (error.message.includes('登录已过期') || error.message.includes('401') || error.message.includes('Unauthorized'))) {
          alert('登录已过期，请重新登录后再试。');
          // 清除认证信息并刷新页面
          clearBackendAuth();
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          alert('保存失败：' + error.message);
        }
      }
    });
  }
  
  // 初始加载：如果已登录，从后端加载；否则显示空列表
  if (backendState.token) {
    loadIngredientsFromBackend();
  } else {
    store.ingredients = [];
    renderIngredientsList();
  }
  
  // 当数据变化时，更新名称筛选下拉框
  const originalSaveApp = saveApp;
  const checkAndUpdate = () => {
    setTimeout(async () => {
      await loadAllIngredientsForFilters();
    }, 100);
  };
  
  // 监听数据变化，更新名称筛选
  checkAndUpdate();
}

// 暴露给全局，方便按钮调用
window.openIngredientForm = openIngredientForm;
window.deleteIngredient = deleteIngredient;
window.removeCategory = removeCategory;
window.selectNameForForm = selectNameForForm;

// ========== 食谱管理模块 ==========

// 当前编辑的食谱的食材列表（临时存储）
let currentRecipeIngredients = [];
let currentRecipeCookingSteps = [];

// 当前选中的原料ID（用于搜索）
let selectedIngredientId = null;

// 搜索原料并显示结果
async function searchIngredients(query) {
  const resultsEl = $('r-ingredient-search-results');
  if (!resultsEl) return;
  
  const q = (query || '').trim();
  
  if (!q) {
    resultsEl.style.display = 'none';
    selectedIngredientId = null;
    return;
  }
  
  let matches = [];
  
  // 始终从服务器端搜索
  if (!backendState.token) {
    resultsEl.innerHTML = '<div style="padding:12px; text-align:center; color:var(--text-secondary);">请先登录以搜索原料</div>';
    resultsEl.style.display = 'block';
    return;
  }
  
  try {
    const params = new URLSearchParams({
      search: q,
      // 不限制分类，允许搜索食材和营养补充剂（食谱中可以添加这两种）
      pageSize: 20 // 增加结果数量，因为要去重
    });
    const data = await backendRequest(`/api/v1/ingredients?${params.toString()}`);
    // 过滤，只包含食材和营养补充剂（排除包材）
    matches = (data.items || [])
      .filter(ing => ing.classification === '食材' || ing.classification === '营养补充剂')
      .map(ing => ({
        id: `ing_${ing.id}`, // 修复：使用 ing_ 前缀，与 loadIngredientsFromBackend 保持一致
        _backendId: ing.id,
        name: ing.name,
        description: ing.description,
        brand: ing.brand,
        category: ing.category,
        classification: ing.classification,
        unit: ing.unit || 'g'
      }))
      // 按食材名称和单位去重（因为食谱中只保存名称，显示多个同名原料没有意义）
      .filter((ing, index, self) => 
        index === self.findIndex(i => i.name === ing.name && (i.unit || 'g') === (ing.unit || 'g'))
      );
  } catch (error) {
    console.error('[searchIngredients] 后端搜索失败:', error);
    resultsEl.innerHTML = '<div style="padding:12px; text-align:center; color:var(--text-error);">搜索失败，请稍后重试</div>';
    resultsEl.style.display = 'block';
    return;
  }
  
  if (matches.length === 0) {
    resultsEl.innerHTML = '<div style="padding:12px; text-align:center; color:var(--text-secondary);">未找到匹配的原料</div>';
    resultsEl.style.display = 'block';
    return;
  }
  
  resultsEl.innerHTML = matches.map(ing => {
    const unit = ing.unit || 'g';
    // 只显示食材名称，不包含品牌、说明等其他信息
    const displayName = ing.name || '-';
    
    return `
      <div class="ingredient-search-item" data-id="${ing.id}" data-backend-id="${ing._backendId || ''}" style="padding:8px 12px; cursor:pointer; border-bottom:0.5px solid var(--border); transition:background 0.2s;"
           onmouseover="this.style.background='var(--bg-secondary)'"
           onmouseout="this.style.background=''">
        <div style="font-weight:500;">${displayName}</div>
        <div style="font-size:12px; color:var(--text-secondary);">单位: ${unit}</div>
      </div>
    `;
  }).join('');
  
  // 绑定点击事件
  resultsEl.querySelectorAll('.ingredient-search-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      // 设置选中的食材ID（数据来自服务器，ID格式为 ing_xxx）
      selectedIngredientId = id;
      const searchInput = $('r-ingredient-search');
      if (searchInput) {
        // 从搜索结果中提取显示文本（第一个div包含完整名称）
        const displayDiv = item.querySelector('div:first-child');
        const displayText = displayDiv ? displayDiv.textContent.trim() : '';
        searchInput.value = displayText;
      }
      resultsEl.style.display = 'none';
    });
  });
  
  resultsEl.style.display = 'block';
}
// 当前正在编辑的食材索引（用于原位置编辑）
let editingIngredientIndex = null;
// 渲染食谱中的食材列表
function renderRecipeIngredientsList() {
  const listEl = $('recipe-ingredients-list');
  if (!listEl) return;
  
  if (currentRecipeIngredients.length === 0) {
    listEl.innerHTML = '<div class="muted" style="text-align:center; padding:12px;">暂无食材，请添加</div>';
    return;
  }
  
  listEl.innerHTML = currentRecipeIngredients.map((item, idx) => {
    // 直接使用保存的食材名称
    const ingredientName = item.ingredientName || '';
    if (!ingredientName) return '';
    
    const unit = item.unit || 'g';
    // 直接显示食材名称
    const displayText = ingredientName;
    
    const isEditing = editingIngredientIndex === idx;
    
    return `
      <div class="recipe-ingredient-item" data-index="${idx}" draggable="${!isEditing}" style="display:flex; flex-direction:column; padding:8px; border:0.5px solid var(--border); border-radius:6px; background:var(--bg-secondary); ${isEditing ? 'border:2px solid var(--primary);' : 'cursor:move;'} transition:all 0.2s;"
           onmouseover="${!isEditing ? 'this.style.opacity=\'0.9\'' : ''}" onmouseout="${!isEditing ? 'this.style.opacity=\'1\'' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px; flex:1;">
            <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border-radius:4px; font-weight:600; font-size:14px; color:var(--text-primary); flex-shrink:0;">${idx + 1}</div>
            <div style="flex:1;">
              <div style="font-weight:500;">${displayText}</div>
              ${!isEditing ? `<div style="font-size:12px; color:var(--text-secondary);">${item.weight} ${unit}</div>` : ''}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn small" data-edit-ingredient="${idx}" style="font-size:12px;">${isEditing ? '保存' : '编辑'}</button>
            <button type="button" class="btn small" data-remove-ingredient="${idx}" style="font-size:12px;">删除</button>
          </div>
        </div>
        ${isEditing ? `
          <div style="margin-top:8px; padding-top:8px; border-top:0.5px solid var(--border);">
            <div style="display:flex; gap:8px; align-items:center;">
              <label style="flex:1; margin:0; font-size:13px;">
                <span style="display:block; margin-bottom:4px; color:var(--text-secondary);">重量</span>
                <input type="number" min="0" step="0.1" value="${item.weight}" data-edit-weight="${idx}" style="width:100%; padding:6px 10px; font-size:14px;" />
              </label>
              <span style="font-size:13px; color:var(--text-secondary);">${unit}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  // 绑定拖拽事件
  let draggedIndex = null;
  
  listEl.querySelectorAll('.recipe-ingredient-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedIndex = parseInt(item.dataset.index, 10);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedIndex);
      item.style.opacity = '0.5';
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', (e) => {
      item.style.opacity = '1';
      item.classList.remove('dragging');
      listEl.querySelectorAll('.recipe-ingredient-item').forEach(el => {
        el.classList.remove('drag-over');
      });
      draggedIndex = null;
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const afterElement = getDragAfterElement(listEl, e.clientY);
      const dragging = listEl.querySelector('.dragging');
      
      if (dragging && afterElement == null) {
        listEl.appendChild(dragging);
      } else if (dragging && afterElement) {
        listEl.insertBefore(dragging, afterElement);
      }
    });
    
    item.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (item.classList.contains('dragging')) return;
      item.classList.add('drag-over');
    });
    
    item.addEventListener('dragleave', (e) => {
      item.classList.remove('drag-over');
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      
      if (draggedIndex === null) return;
      
      // 获取拖拽元素在DOM中的最终位置
      const draggingEl = listEl.querySelector('.dragging');
      if (!draggingEl) return;
      
      // 基于DOM顺序计算目标索引
      const allItems = Array.from(listEl.children).filter(el => el.classList.contains('recipe-ingredient-item'));
      const toIndex = allItems.indexOf(draggingEl);
      
      if (draggedIndex !== toIndex && !isNaN(toIndex) && toIndex >= 0 && toIndex < currentRecipeIngredients.length) {
        // 移动数组元素
        const [movedItem] = currentRecipeIngredients.splice(draggedIndex, 1);
        currentRecipeIngredients.splice(toIndex, 0, movedItem);
        
        // 更新编辑索引
        updateIndicesAfterDrag(draggedIndex, toIndex);
        
        renderRecipeIngredientsList();
        calculateRecipeTotalWeight();
      }
    });
  });
  
  // 绑定编辑按钮
  listEl.querySelectorAll('[data-edit-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.editIngredient, 10);
      const item = currentRecipeIngredients[idx];
      if (!item) return;
      
      if (editingIngredientIndex === idx) {
        // 保存编辑
        const weightInputEl = listEl.querySelector(`[data-edit-weight="${idx}"]`);
        const newWeight = parseFloat(weightInputEl ? weightInputEl.value : 0);
        
        if (newWeight <= 0) {
          alert('请输入重量（大于0）');
          return;
        }
        
        // 更新当前项
        item.weight = newWeight;
        
        editingIngredientIndex = null;
        selectedIngredientId = null;
        const searchInput = $('r-ingredient-search');
        if (searchInput) searchInput.value = '';
        const weightInput = $('r-ingredient-weight');
        if (weightInput) weightInput.value = '';
        
        renderRecipeIngredientsList();
        calculateRecipeTotalWeight();
      } else {
        // 开始编辑（取消之前的编辑）
        if (editingIngredientIndex !== null && editingIngredientIndex !== idx) {
          // 取消之前的编辑
          const prevItem = currentRecipeIngredients[editingIngredientIndex];
          if (prevItem) {
            // 恢复原值（如果之前有修改）
            const prevWeightInputEl = listEl.querySelector(`[data-edit-weight="${editingIngredientIndex}"]`);
            if (prevWeightInputEl) {
              prevItem.weight = parseFloat(prevWeightInputEl.value) || prevItem.weight;
            }
          }
        }
        
        editingIngredientIndex = idx;
        // 不再需要设置 selectedIngredientId，因为编辑时只修改重量
        
        renderRecipeIngredientsList();
        
        // 滚动到编辑项并聚焦重量输入框
        const itemEl = listEl.querySelector(`[data-index="${idx}"]`);
        if (itemEl) {
          itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setTimeout(() => {
            const weightInputEl = itemEl.querySelector(`[data-edit-weight="${idx}"]`);
            if (weightInputEl) {
              weightInputEl.focus();
              weightInputEl.select();
            }
          }, 100);
        }
      }
    });
  });
  
  // 绑定卡片内重量输入框的回车事件
  listEl.querySelectorAll('[data-edit-weight]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const idx = parseInt(input.dataset.editWeight, 10);
        const saveBtn = listEl.querySelector(`[data-edit-ingredient="${idx}"]`);
        if (saveBtn) {
          saveBtn.click();
        }
      }
    });
    
    input.addEventListener('blur', () => {
      // 失去焦点时自动保存（可选）
      // const idx = parseInt(input.dataset.editWeight, 10);
      // if (editingIngredientIndex === idx) {
      //   const saveBtn = listEl.querySelector(`[data-edit-ingredient="${idx}"]`);
      //   if (saveBtn) saveBtn.click();
      // }
    });
  });
  
  // 绑定删除按钮
  listEl.querySelectorAll('[data-remove-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removeIngredient, 10);
      
      // 如果正在编辑该项，取消编辑
      if (editingIngredientIndex === idx) {
        editingIngredientIndex = null;
        selectedIngredientId = null;
        const searchInput = $('r-ingredient-search');
        const weightInput = $('r-ingredient-weight');
        if (searchInput) searchInput.value = '';
        if (weightInput) weightInput.value = '';
      } else if (editingIngredientIndex !== null && editingIngredientIndex > idx) {
        // 如果删除的项在编辑项之前，更新编辑索引
        editingIngredientIndex--;
      }
      
      currentRecipeIngredients.splice(idx, 1);
      renderRecipeIngredientsList();
      calculateRecipeTotalWeight();
    });
  });
}

// 获取拖拽目标位置
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.recipe-ingredient-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 更新拖拽后的索引
function updateIndicesAfterDrag(fromIndex, toIndex) {
  // 重新渲染会更新索引，但需要更新编辑索引
  if (editingIngredientIndex !== null) {
    if (editingIngredientIndex === fromIndex) {
      editingIngredientIndex = toIndex;
    } else if (editingIngredientIndex > fromIndex && editingIngredientIndex <= toIndex) {
      editingIngredientIndex--;
    } else if (editingIngredientIndex < fromIndex && editingIngredientIndex >= toIndex) {
      editingIngredientIndex++;
    }
  }
}

// 生成食谱编号
// 规则：生命阶段 + 营养参考标准 + 食谱类型 + 升序三位数
// 生命阶段：成犬="C", 幼犬="Y", 老年犬="L", 哺乳期="B", 妊娠期="R"
// 营养参考标准：AAFCO="A", FEDIAF="F", NRC="N"
// 食谱类型：通用="T", 定制="D"
async function generateRecipeCode(lifeStage, nutritionStandard, recipeType, excludeId = null) {
  const lifeStageMap = {
    'adult': 'C',
    'puppy': 'Y',
    'senior': 'L',
    'lactation': 'B',
    'pregnancy': 'R'
  };
  
  const standardMap = {
    'AAFCO': 'A',
    'FEDIAF': 'F',
    'NRC': 'N'
  };
  
  const typeMap = {
    'standard': 'T',
    'custom': 'D'
  };
  
  const prefix = (lifeStageMap[lifeStage] || 'C') + 
                 (standardMap[nutritionStandard] || 'F') + 
                 (typeMap[recipeType] || 'T');
  
  let recipes = [];
  
  // 如果已登录，从后端获取所有食谱以确保全局唯一性
  if (backendState.token) {
    try {
      const data = await backendRequest('/api/v1/recipes?pageSize=10000');
      recipes = (data.items || []).map(recipe => ({
        id: `recipe_${recipe.id}`,
        code: recipe.code || ''
      }));
    } catch (error) {
      console.warn('[generateRecipeCode] 从后端加载失败，使用本地数据:', error);
      recipes = store.recipes;
    }
  } else {
    recipes = store.recipes;
  }
  
  // 找到相同前缀的所有食谱，计算下一个编号
  const samePrefix = recipes
    .filter(recipe => {
      if (excludeId && recipe.id === excludeId) return false;
      if (!recipe.code) return false;
      return recipe.code.startsWith(prefix);
    });
  
  // 找到最大编号
  let maxNum = 0;
  samePrefix.forEach(recipe => {
    if (recipe.code) {
      const match = recipe.code.match(new RegExp(`^${prefix}(\\d{3})$`));
      if (match) {
        const num = parseInt(match[1], 10);
        maxNum = Math.max(maxNum, num);
      }
    }
  });
  
  // 计算下一个编号
  const nextNum = maxNum + 1;
  const code = prefix + String(nextNum).padStart(3, '0');
  
  return code;
}

// 自动生成食谱编号
async function autoGenerateRecipeCode() {
  const lifeStage = $('r-lifeStage').value || 'adult';
  const nutritionStandard = $('r-nutritionStandard').value || 'FEDIAF';
  const recipeType = $('r-recipeType').value || 'standard';
  const recipeId = $('recipe-id').value || null;
  
  const code = await generateRecipeCode(lifeStage, nutritionStandard, recipeType, recipeId);
  const codeEl = $('r-code');
  if (codeEl) {
    codeEl.value = code;
  }
}

// 添加食材到食谱
async function addIngredientToRecipe() {
  const weightInput = $('r-ingredient-weight');
  const searchInput = $('r-ingredient-search');
  
  if (!weightInput) return;
  
  const ingredientId = selectedIngredientId;
  const weight = parseFloat(weightInput.value) || 0;
  
  if (!ingredientId) {
    alert('请先搜索并选择原料');
    return;
  }
  
  if (weight <= 0) {
    alert('请输入重量（大于0）');
    return;
  }
  
  // 尝试从 store.ingredients 中查找
  let ing = store.ingredients.find(i => i.id === ingredientId);
  
  // 如果找不到，尝试从后端获取（如果 ingredientId 包含 _backendId 信息）
  if (!ing && backendState.token) {
    // 从 ingredientId 格式中提取：ing_123 -> 123
    const backendIdMatch = ingredientId.match(/^ing_(\d+)$/);
    if (backendIdMatch) {
      const backendId = parseInt(backendIdMatch[1], 10);
      try {
        const data = await backendRequest(`/api/v1/ingredients/${backendId}`);
        // 确保source字段被正确读取
        const sourceValue = (data.source !== null && data.source !== undefined && data.source !== '') 
          ? String(data.source).trim() 
          : '';
        
        // 转换为前端格式（与 loadIngredientsFromBackend 保持一致）
        ing = {
          id: `ing_${data.id}`,
          _backendId: data.id,
          code: data.code || '',
          category: data.category || '',
          name: data.name || '',
          brand: data.brand || '',
          source: sourceValue,
          cost: data.cost || null,
          quantity: data.quantity || null,
          unit: data.unit || 'g',
          pricePer500: data.pricePer500 || null,
          ediblePortion: data.ediblePortion !== undefined ? data.ediblePortion : 1.0,
          ediblePricePer500: data.ediblePricePer500 || null,
          weightPerUnit: data.weightPerUnit || null,
          classification: data.classification || null,
          description: data.description || '',
          mainFunction: data.mainFunction || '',
          subject: data.subject || null,
          part: data.part || null,
          originType: data.originType || null,
          model: data.model || null,
          mainNutrient: data.mainNutrient || null,
          unitContent: data.unitContent || null,
          nutrientUnit: data.nutrientUnit || null,
          pricePer100NutrientUnit: data.pricePer100NutrientUnit || null,
          createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
        };
        
        // 重要：将获取的食材添加到 store.ingredients 缓存中（如果不存在）
        const existingIndex = store.ingredients.findIndex(i => i.id === ing.id);
        if (existingIndex >= 0) {
          // 如果已存在，更新它
          store.ingredients[existingIndex] = ing;
        } else {
          // 如果不存在，添加到数组
          store.ingredients.push(ing);
        }
      } catch (error) {
        console.error('[addIngredientToRecipe] 从后端获取食材失败:', error);
        alert('无法获取食材信息，请重试');
        return;
      }
    }
  }
  
  if (!ing) {
    alert('原料不存在，请重新搜索并选择');
    return;
  }
  
  // 检查是否为包材，如果是则不允许添加
  if (ing.classification === '包材') {
    alert('食谱中不能添加包材，请选择食材');
    return;
  }
  
  // 获取食材名称（只保存名称，不保存ID）
  const ingredientName = ing.name || '';
  if (!ingredientName) {
    alert('食材名称不能为空');
    return;
  }
  
  // 如果正在编辑某个项，更新该项
  if (editingIngredientIndex !== null) {
    const item = currentRecipeIngredients[editingIngredientIndex];
    if (item) {
      item.ingredientName = ingredientName; // 只保存食材名称
      item.weight = weight;
      item.unit = ing.unit || 'g';
      editingIngredientIndex = null;
      renderRecipeIngredientsList();
      calculateRecipeTotalWeight();
      
      // 清空输入
      selectedIngredientId = null;
      if (searchInput) searchInput.value = '';
      if (weightInput) weightInput.value = '';
      const resultsEl = $('r-ingredient-search-results');
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }
  }
  
  // 检查是否已添加（编辑模式下不检查）- 根据食材名称判断
  const exists = currentRecipeIngredients.find(item => item.ingredientName === ingredientName);
  if (exists) {
    if (confirm('该食材已添加，是否更新重量？')) {
      exists.weight = weight;
      exists.unit = ing.unit || 'g';
    } else {
      return;
    }
  } else {
    currentRecipeIngredients.push({
      ingredientName: ingredientName, // 只保存食材名称，不保存ID
      weight: weight,
      unit: ing.unit || 'g'
    });
  }
  
  renderRecipeIngredientsList();
  calculateRecipeTotalWeight();
  
  // 清空输入
  selectedIngredientId = null;
  if (searchInput) searchInput.value = '';
  if (weightInput) weightInput.value = '';
  const resultsEl = $('r-ingredient-search-results');
  if (resultsEl) resultsEl.style.display = 'none';
}

// 计算食谱总重量（只计算单位为g的食材）
function calculateRecipeTotalWeight() {
  let totalWeight = 0;
  
  currentRecipeIngredients.forEach(item => {
    // 使用食材名称查找（可能有多个同名食材，取第一个匹配的）
    const ing = store.ingredients.find(i => i.name === item.ingredientName && i.classification === '食材');
    
    // 确定单位：优先使用item.unit，如果item.unit为空或undefined，则使用ing.unit，最后默认为'g'
    // 注意：item.unit 在 openRecipeForm 中已经被处理过（空值会被设置为'g'），但这里为了安全还是做一次处理
    let unit = item.unit;
    if (!unit || (typeof unit === 'string' && unit.trim() === '')) {
      unit = ing ? (ing.unit || 'g') : 'g';
    }
    
    // 只计算单位为'g'的食材
    if (unit !== 'g') {
      return; // 跳过非'g'单位的食材
    }
    
    // 确保 weight 是数字
    const itemWeight = parseFloat(item.weight) || 0;
    
    // 单位已经是'g'，直接累加
    totalWeight += itemWeight;
  });
  
  const totalWeightEl = $('r-totalWeight');
  if (totalWeightEl) {
    totalWeightEl.value = totalWeight.toFixed(2);
  }
  
  // 同时计算热量密度
  calculateRecipeKcalDensity();
}
// 渲染制作流程列表
function renderRecipeCookingSteps() {
  const stepsEl = $('recipe-cooking-steps');
  if (!stepsEl) return;
  
  if (currentRecipeCookingSteps.length === 0) {
    stepsEl.innerHTML = '<div class="muted" style="text-align:center; padding:12px; font-size:13px;">暂无制作流程，点击"添加步骤"添加</div>';
    return;
  }
  
  stepsEl.innerHTML = currentRecipeCookingSteps.map((step, idx) => `
    <div style="display:flex; gap:8px; align-items:start; padding:8px; border:0.5px solid var(--border); border-radius:6px; background:var(--bg-secondary); margin-bottom:6px;">
      <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border-radius:4px; font-weight:600; font-size:13px; color:var(--text-primary); flex-shrink:0; margin-top:2px;">${idx + 1}</div>
      <textarea data-step-index="${idx}" style="flex:1; min-height:60px; padding:8px; font-size:13px; border:0.5px solid var(--border); border-radius:4px; resize:vertical;" placeholder="请输入制作步骤...">${step.description || step || ''}</textarea>
      <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0;">
        ${idx > 0 ? `<button type="button" class="btn small" data-move-step-up="${idx}" style="font-size:11px; padding:4px 8px;">↑</button>` : '<div style="height:28px;"></div>'}
        ${idx < currentRecipeCookingSteps.length - 1 ? `<button type="button" class="btn small" data-move-step-down="${idx}" style="font-size:11px; padding:4px 8px;">↓</button>` : '<div style="height:28px;"></div>'}
        <button type="button" class="btn small" data-remove-step="${idx}" style="font-size:11px; padding:4px 8px;">删除</button>
      </div>
    </div>
  `).join('');
  
  // 绑定删除按钮
  stepsEl.querySelectorAll('[data-remove-step]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.removeStep, 10);
      currentRecipeCookingSteps.splice(idx, 1);
      renderRecipeCookingSteps();
    });
  });
  
  // 绑定步骤顺序调整按钮（上移/下移）
  stepsEl.querySelectorAll('[data-move-step-up]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.moveStepUp, 10);
      if (idx > 0) {
        [currentRecipeCookingSteps[idx], currentRecipeCookingSteps[idx - 1]] = 
          [currentRecipeCookingSteps[idx - 1], currentRecipeCookingSteps[idx]];
        renderRecipeCookingSteps();
      }
    });
  });
  
  stepsEl.querySelectorAll('[data-move-step-down]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.moveStepDown, 10);
      if (idx < currentRecipeCookingSteps.length - 1) {
        [currentRecipeCookingSteps[idx], currentRecipeCookingSteps[idx + 1]] = 
          [currentRecipeCookingSteps[idx + 1], currentRecipeCookingSteps[idx]];
        renderRecipeCookingSteps();
      }
    });
  });
  
  // 绑定textarea输入事件（自动保存）
  stepsEl.querySelectorAll('[data-step-index]').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const idx = parseInt(textarea.dataset.stepIndex, 10);
      if (idx >= 0 && idx < currentRecipeCookingSteps.length) {
        currentRecipeCookingSteps[idx] = textarea.value;
      }
    });
  });
}

// 添加制作步骤
function addCookingStep() {
  currentRecipeCookingSteps.push('');
  renderRecipeCookingSteps();
  
  // 聚焦到新添加的textarea
  setTimeout(() => {
    const stepsEl = $('recipe-cooking-steps');
    if (stepsEl) {
      const lastTextarea = stepsEl.querySelector(`[data-step-index="${currentRecipeCookingSteps.length - 1}"]`);
      if (lastTextarea) {
        lastTextarea.focus();
        lastTextarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, 100);
}

// 计算热量密度（总热量 ÷ 总重量 × 1000）
function calculateRecipeKcalDensity() {
  const totalKcalEl = $('r-totalKcal');
  const totalWeightEl = $('r-totalWeight');
  const kcalDensityEl = $('r-kcalDensity');
  
  if (!totalKcalEl || !totalWeightEl || !kcalDensityEl) return;
  
  const totalKcal = parseFloat(totalKcalEl.value) || 0;
  const totalWeight = parseFloat(totalWeightEl.value) || 0;
  
  if (totalWeight > 0) {
    const density = (totalKcal / totalWeight) * 1000;
    kcalDensityEl.value = density.toFixed(2);
  } else {
    kcalDensityEl.value = '';
  }
}

// 格式化食谱详细信息
function formatRecipeDetails(recipe) {
  // 生命阶段映射（统一为幼年期/成年期，兼容旧数据）
  const lifeStageMap = { 
    puppy: '幼年期', 
    adult: '成年期',
    senior: '成年期', 
    pregnancy: '成年期', 
    lactation: '成年期' 
  };
  
  let html = '<div class="item-details" style="font-size:13px; line-height:1.6;">';
  
  // ========== 1. 基本信息板块 ==========
  html += '<div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border);">';
  html += '<div style="font-weight:600; font-size:14px; margin-bottom:8px; color:var(--text-primary);">基本信息</div>';
  
  // 使用紧凑的两列布局
  html += '<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:6px 16px; margin-bottom:8px;">';
  html += `<div><span style="color:var(--text-secondary);">食谱编号：</span><span>${escapeHtml(recipe.code || '-')}</span></div>`;
  html += `<div><span style="color:var(--text-secondary);">食谱名称：</span><span>${escapeHtml(recipe.name || '-')}</span></div>`;
  html += `<div><span style="color:var(--text-secondary);">适用生命阶段：</span><span>${escapeHtml(lifeStageMap[recipe.lifeStage] || recipe.lifeStage || '-')}</span></div>`;
  html += `<div><span style="color:var(--text-secondary);">营养参考标准：</span><span>${escapeHtml(nutritionLabelMap[recipe.nutritionStandard] || recipe.nutritionStandard || '-')}</span></div>`;
  html += `<div><span style="color:var(--text-secondary);">食谱制作软件：</span><span>${escapeHtml(recipe.software || '-')}</span></div>`;
  html += `<div><span style="color:var(--text-secondary);">食谱类型：</span><span>${escapeHtml(recipeTypeLabelMap[recipe.recipeType] || (recipe.isCustom ? '定制食谱' : '通用食谱'))}</span></div>`;
  html += `<div><span style="color:var(--text-secondary);">制作损耗：</span><span>${recipe.cookingLoss != null ? `${recipe.cookingLoss}%` : '-'}</span></div>`;
  html += '</div>';
  
  // 食谱描述（始终显示，即使为空也显示标签）
  html += `<div style="margin-top:8px;"><span style="color:var(--text-secondary);">食谱描述：</span></div>`;
  if (recipe.description && recipe.description.trim()) {
    html += `<div style="margin-top:4px; padding:8px; background:var(--bg-secondary); border-radius:4px; white-space:pre-wrap;">${escapeHtml(recipe.description)}</div>`;
  } else {
    html += `<div style="margin-top:4px; padding:8px; background:var(--bg-secondary); border-radius:4px; color:var(--text-secondary); font-style:italic;">暂无描述</div>`;
  }
  
  html += '</div>';
  
  // ========== 2. 食材列表板块 ==========
  html += '<div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border);">';
  html += '<div style="font-weight:600; font-size:14px; margin-bottom:8px; color:var(--text-primary);">食材列表</div>';
  
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    // 计算总重量（只计算单位为g的食材，用于计算重量占比）
    let totalWeightForPercent = 0;
    const ingredientsData = [];
    
    recipe.ingredients.forEach((item, idx) => {
      const ingredientName = (item.ingredientName || '').trim();
      
      // 使用食材名称查找（先找食材，再找营养补充剂）
      let ing = store.ingredients.find(i => i.name === ingredientName && i.classification === '食材');
      let supplement = store.ingredients.find(i => i.name === ingredientName && i.classification === '营养补充剂');
      let ingredient = ing || supplement;
      
      // 如果精确匹配没找到，尝试去掉空格后匹配
      if (!ingredient && ingredientName) {
        const normalizedName = ingredientName.replace(/\s+/g, '');
        ing = store.ingredients.find(i => {
          const storeName = (i.name || '').replace(/\s+/g, '');
          return storeName === normalizedName && i.classification === '食材';
        });
        supplement = store.ingredients.find(i => {
          const storeName = (i.name || '').replace(/\s+/g, '');
          return storeName === normalizedName && i.classification === '营养补充剂';
        });
        ingredient = ing || supplement;
      }
      
      // 如果还是找不到，尝试模糊匹配
      if (!ingredient && ingredientName) {
        supplement = store.ingredients.find(i => {
          if (i.classification !== '营养补充剂') return false;
          const storeName = (i.name || '').trim();
          return storeName === ingredientName || 
                 storeName.includes(ingredientName) || 
                 ingredientName.includes(storeName);
        });
        if (supplement) {
          ingredient = supplement;
        } else {
          ing = store.ingredients.find(i => {
            if (i.classification !== '食材') return false;
            const storeName = (i.name || '').trim();
            return storeName === ingredientName || 
                   storeName.includes(ingredientName) || 
                   ingredientName.includes(storeName);
          });
          if (ing) {
            ingredient = ing;
          }
        }
      }
      
      // 即使找不到ingredient，也显示食材信息
      const unit = item.unit || (ingredient ? ingredient.unit : 'g');
      const weight = parseFloat(item.weight) || 0;
      
      // 确定分类：如果有ingredient就用ingredient的分类
      // 如果找不到ingredient，标记为需要查询（不默认分类为'食材'）
      let classification = ingredient ? ingredient.classification : null;
      const needsQuery = !ingredient; // 标记是否需要查询
      
      // 计算重量（用于占比计算，只计算单位为g的食材）
      // 只有确认是食材且单位为g时才计算
      let weightInG = 0;
      if (classification === '食材' && unit === 'g') {
        weightInG = weight;
        totalWeightForPercent += weightInG;
      }
      
      ingredientsData.push({
        index: idx + 1,
        name: ingredientName || '未知食材',
        weight: weight,
        unit: unit,
        classification: classification, // 可能是 null
        ingredient: ingredient,
        weightInG: weightInG,
        needsQuery: needsQuery // 新增字段：标记是否需要查询
      });
    });
    
    // 添加表头
    html += '<div style="display:grid; grid-template-columns: 50px 1fr 120px 200px; gap:8px; padding:2px; background:var(--bg-tertiary); border-radius:4px; margin-bottom:1.5px; font-weight:600; font-size:13px; border-bottom:2px solid var(--border);">';
    html += '<div>序号</div>';
    html += '<div>食材名称</div>';
    html += '<div>用量</div>';
    html += '<div>重量占比/营养补充剂量</div>';
    html += '</div>';
    
    // 渲染食材列表（序号、名称、用量、重量占比/每100g营养素在同一行）
    ingredientsData.forEach(item => {
      html += '<div style="display:grid; grid-template-columns: 50px 1fr 120px 200px; gap:8px; padding:1.5px; background:var(--bg-secondary); border-radius:4px; margin-bottom:1px; align-items:center;">';
      
      // 序号
      html += `<div style="font-weight:500;">${item.index}.</div>`;
      
      // 食材名称
      html += `<div style="font-weight:500;">${escapeHtml(item.name)}</div>`;
      
      // 用量
      html += `<div style="color:var(--text-secondary);">${item.weight} ${item.unit}</div>`;
      
      // 重量占比或营养素信息（第四列）
      let fourthColumn = '-';
      
      // 如果标记为需要查询，先显示"加载中..."并标记为需要查询
      if (item.needsQuery && item.name) {
        // 标记为需要查询，不区分是食材还是营养补充剂
        // 在异步查询时，会根据查询结果判断分类
        fourthColumn = `<span data-ingredient-query="${escapeHtml(item.name)}" style="color:var(--text-secondary);">加载中...</span>`;
        console.log(`[formatRecipeDetails] 食材 "${item.name}" 未找到，标记为需要查询`);
      } else if (item.classification === '食材') {
        // 食材：显示重量占比（不显示"重量占比："文字）
        if (totalWeightForPercent > 0 && item.weightInG > 0) {
          const weightPercent = ((item.weightInG / totalWeightForPercent) * 100).toFixed(2);
          fourthColumn = `${weightPercent}%`;
        }
      } else if (item.classification === '营养补充剂') {
        // 营养补充剂：显示每100g饭量添加的营养素
        let supplement = item.ingredient;
        
        // 如果找不到ingredient，尝试从store中再次查找
        // 首先使用精确匹配（使用item.name，因为ingredientsData中已经设置了name字段）
        if (!supplement && item.name) {
          supplement = store.ingredients.find(i => {
            return i.name === item.name && i.classification === '营养补充剂';
          });
        }
        
        // 如果还是找不到，尝试查找所有营养补充剂，看看是否有名称相似的情况
        if (!supplement && item.name) {
          // 先尝试去掉可能的空格和特殊字符
          const normalizedName = item.name.trim().replace(/\s+/g, '');
          supplement = store.ingredients.find(i => {
            if (i.classification !== '营养补充剂') return false;
            const normalizedStoreName = (i.name || '').trim().replace(/\s+/g, '');
            return normalizedStoreName === normalizedName;
          });
        }
        
        // 如果还是找不到，尝试模糊匹配（处理可能的名称差异）
        if (!supplement && item.name) {
          supplement = store.ingredients.find(i => {
            if (i.classification !== '营养补充剂') return false;
            const storeName = (i.name || '').trim();
            const itemName = item.name.trim();
            return storeName === itemName || 
                   storeName.includes(itemName) || 
                   itemName.includes(storeName);
          });
        }
        
        // 如果找不到supplement，或者找到了但数据不完整（unitContent为0或null），标记需要从后端查询
        if (!supplement && item.name) {
          // 添加 data 属性标记，用于后续异步查询
          fourthColumn = `<span data-supplement-query="${escapeHtml(item.name)}" style="color:var(--text-secondary);">加载中...</span>`;
          console.log(`[formatRecipeDetails] 营养补充剂 "${item.name}" 未找到，标记为需要查询`);
        } else if (supplement) {
          const unitContent = parseFloat(supplement.unitContent) || 0;
          const nutrientUnit = supplement.nutrientUnit || '';
          const mainNutrient = supplement.mainNutrient || '';
          
          // 修复：使用计算出的 totalWeightForPercent 作为总重量，而不是 recipe.totalWeight
          // 如果 totalWeightForPercent 为 0，则使用服务器端的 recipe.totalWeight 作为后备
          const effectiveTotalWeight = totalWeightForPercent > 0 ? totalWeightForPercent : (recipe.totalWeight || 0);
          
          // 调试信息：输出营养补充剂的详细信息
          console.log(`[formatRecipeDetails] 营养补充剂 "${item.name}":`, {
            unitContent,
            nutrientUnit,
            mainNutrient,
            weight: item.weight,
            totalWeightForPercent,
            recipeTotalWeight: recipe.totalWeight,
            effectiveTotalWeight,
            supplement: {
              name: supplement.name,
              unitContent: supplement.unitContent,
              nutrientUnit: supplement.nutrientUnit,
              mainNutrient: supplement.mainNutrient
            }
          });
          
          // 检查必要的数据是否完整
          // 如果数据不完整（unitContent为0或null），也标记为需要查询
          if (unitContent > 0 && effectiveTotalWeight > 0 && item.weight > 0) {
            // N = 该营养补充剂在食谱中的用量 * 该营养补充剂营养素含量 / 食谱总重量 * 100
            const N = Math.round((item.weight * unitContent / effectiveTotalWeight) * 100);
            if (N > 0) {
              // 即使 nutrientUnit 或 mainNutrient 为空，也尝试显示
              if (nutrientUnit && mainNutrient) {
                fourthColumn = `每100g饭量添加 ${N} ${nutrientUnit} ${mainNutrient}`;
              } else if (nutrientUnit) {
                fourthColumn = `每100g饭量添加 ${N} ${nutrientUnit}`;
              } else if (mainNutrient) {
                fourthColumn = `每100g饭量添加 ${N} ${mainNutrient}`;
              } else {
                // 如果都没有，至少显示N值
                fourthColumn = `每100g饭量添加 ${N} 单位营养素`;
              }
            } else {
              console.warn(`[formatRecipeDetails] 营养补充剂 "${item.name}" 计算出的N为0或负数，标记为需要查询:`, {
                weight: item.weight,
                unitContent,
                totalWeight: effectiveTotalWeight,
                calculatedN: (item.weight * unitContent / effectiveTotalWeight) * 100
              });
              // 数据不完整，标记为需要查询
              fourthColumn = `<span data-supplement-query="${escapeHtml(item.name)}" style="color:var(--text-secondary);">加载中...</span>`;
            }
          } else {
            console.warn(`[formatRecipeDetails] 营养补充剂 "${item.name}" 数据不完整，标记为需要查询:`, {
              unitContent,
              totalWeight: effectiveTotalWeight,
              totalWeightForPercent,
              recipeTotalWeight: recipe.totalWeight,
              itemWeight: item.weight,
              hasNutrientUnit: !!nutrientUnit,
              hasMainNutrient: !!mainNutrient
            });
            // 数据不完整，标记为需要查询
            fourthColumn = `<span data-supplement-query="${escapeHtml(item.name)}" style="color:var(--text-secondary);">加载中...</span>`;
          }
        } else {
          // 如果既找不到supplement，也没有item.name，或者supplement为null/undefined但没有进入前面的分支
          // 这种情况应该标记为需要查询
          if (item.name) {
            console.warn(`[formatRecipeDetails] 未找到营养补充剂: "${item.name}"，标记为需要查询`, {
              allSupplements: store.ingredients.filter(i => i.classification === '营养补充剂').map(i => i.name)
            });
            fourthColumn = `<span data-supplement-query="${escapeHtml(item.name)}" style="color:var(--text-secondary);">加载中...</span>`;
          }
        }
      }
      html += `<div style="color:var(--text-secondary); font-size:12px;">${fourthColumn}</div>`;
      
      html += '</div>';
    });
    
    // 最后一行：总热量和总重量
    html += '<div style="margin-top:8px; padding:8px; background:var(--bg-tertiary); border-radius:4px; font-weight:500;">';
    if (recipe.totalKcal != null) {
      html += `<span style="margin-right:16px;">总热量：${parseFloat(recipe.totalKcal).toFixed(2)} kcal</span>`;
    }
    // 修复：使用计算出的 totalWeightForPercent，如果为0则使用服务器端的值
    const displayTotalWeight = totalWeightForPercent > 0 ? totalWeightForPercent : (recipe.totalWeight || 0);
    if (displayTotalWeight > 0) {
      html += `<span>总重量：${parseFloat(displayTotalWeight).toFixed(2)} g</span>`;
    }
    html += '</div>';
    
  } else {
    html += '<div style="color:var(--text-secondary);">暂无食材</div>';
  }
  
  html += '</div>';
  
  // ========== 3. 营养数据板块 ==========
  html += '<div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border);">';
  html += '<div style="font-weight:600; font-size:14px; margin-bottom:8px; color:var(--text-primary);">营养数据（干物质占比，除水分外）</div>';
  
  // 使用紧凑的两列布局
  html += '<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:6px 16px;">';
  if (recipe.protein != null) {
    html += `<div><span style="color:var(--text-secondary);">蛋白质（DM）：</span><span>${recipe.protein}%</span></div>`;
  }
  if (recipe.fat != null) {
    html += `<div><span style="color:var(--text-secondary);">脂肪（DM）：</span><span>${recipe.fat}%</span></div>`;
  }
  if (recipe.carb != null) {
    html += `<div><span style="color:var(--text-secondary);">碳水化合物（DM）：</span><span>${recipe.carb}%</span></div>`;
  }
  if (recipe.fiber != null) {
    html += `<div><span style="color:var(--text-secondary);">膳食纤维（DM）：</span><span>${recipe.fiber}%</span></div>`;
  }
  if (recipe.ash != null) {
    html += `<div><span style="color:var(--text-secondary);">灰分（DM）：</span><span>${recipe.ash}%</span></div>`;
  }
  if (recipe.moisture != null) {
    html += `<div><span style="color:var(--text-secondary);">水分：</span><span>${recipe.moisture}%</span></div>`;
  }
  if (recipe.caRatio || recipe.caPratio) {
    html += `<div><span style="color:var(--text-secondary);">钙磷比：</span><span>${escapeHtml(recipe.caRatio || recipe.caPratio)}</span></div>`;
  }
  if (recipe.kcalDensity != null) {
    html += `<div><span style="color:var(--text-secondary);">热量密度：</span><span>${parseFloat(recipe.kcalDensity).toFixed(2)} kcal/kg</span></div>`;
  }
  html += '</div>';
  
  html += '</div>';
  
  // ========== 4. 制作流程板块（默认隐藏） ==========
  // 始终显示制作流程标题和箭头，即使没有步骤也显示（但内容为空）
  const stepsId = `recipe-steps-${recipe.id || Date.now()}`;
  html += '<div style="margin-bottom:16px;">';
  html += `<div style="display:flex; align-items:center; cursor:pointer; user-select:none; padding:6px; border-radius:4px; transition:background 0.2s;" onclick="(function(el){const steps=el.nextElementSibling;const arrow=el.querySelector('.arrow');if(steps.style.display==='none'||!steps.style.display){steps.style.display='block';arrow.style.transform='rotate(180deg)';}else{steps.style.display='none';arrow.style.transform='rotate(0deg)';}})(this)" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'">`;
  html += `<span style="font-weight:600; font-size:14px; color:var(--text-primary); margin-right:8px;">制作流程</span>`;
  html += `<span class="arrow" style="display:inline-block; transition:transform 0.2s; font-size:12px; color:var(--text-secondary); transform:rotate(0deg);">▼</span>`;
  html += `</div>`;
  html += `<div id="${stepsId}" style="display:none; margin-top:8px; padding-left:16px;">`;
  if (recipe.cookingSteps && recipe.cookingSteps.length > 0) {
    recipe.cookingSteps.forEach((step, index) => {
      const stepDesc = typeof step === 'object' ? step.description : step;
      if (stepDesc) {
        html += `<div style="margin-bottom:6px; padding:6px; background:var(--bg-secondary); border-radius:4px;">`;
        html += `<span style="font-weight:500; margin-right:8px;">${index + 1}.</span>`;
        html += `<span>${escapeHtml(stepDesc)}</span>`;
        html += `</div>`;
      }
    });
  } else {
    html += `<div style="color:var(--text-secondary); font-size:12px; padding:6px;">暂无制作流程</div>`;
  }
  html += `</div>`;
  html += '</div>';
  
  html += '</div>';
  return html;
}

// 分页食谱
function paginatedRecipes() {
  // 如果使用后端数据，直接返回当前页数据（后端已处理分页和搜索）
  if (backendState.token && store.totalRecipes !== undefined) {
    return {
      pageItems: store.recipes,
      total: store.totalRecipes || store.recipes.length,
      totalPages: store.recipeTotalPages || 1
    };
  }
  
  // 本地数据：客户端分页和搜索（仅用于未登录时的降级方案）
  const searchQ = ($('recipe-search').value || '').trim().toLowerCase();
  const lifeStageFilter = ($('recipe-lifeStage-filter').value || '').trim();
  const customFilter = ($('recipe-custom-filter').value || '').trim();
  
  const filtered = store.recipes.filter(recipe => {
    const matchSearch = !searchQ || 
      (recipe.name || '').toLowerCase().includes(searchQ);
    
    const matchLifeStage = !lifeStageFilter || recipe.lifeStage === lifeStageFilter;
    
    let matchCustom = true;
    if (customFilter === 'true') {
      matchCustom = recipe.recipeType === 'custom' || (recipe.recipeType == null && recipe.isCustom === true);
    } else if (customFilter === 'false') {
      matchCustom = recipe.recipeType === 'standard' || (recipe.recipeType == null && (recipe.isCustom === false || recipe.isCustom == null));
    }
    
    return matchSearch && matchLifeStage && matchCustom;
  });
  
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / store.recipePageSize));
  if (store.recipePage > totalPages) store.recipePage = totalPages;
  
  const start = (store.recipePage - 1) * store.recipePageSize;
  const pageItems = filtered.slice(start, start + store.recipePageSize);
  
  return { pageItems, total, totalPages };
}
// 渲染食谱列表
function renderRecipesList() {
  const list = $('recipes-list');
  if (!list) return;
  
  const { pageItems, total, totalPages } = paginatedRecipes();
  
  if (pageItems.length === 0) {
    list.innerHTML = '<div class="muted" style="text-align:center; padding:20px">暂无食谱数据</div>';
    $('recipes-total').textContent = '共 0 条';
    $('recipes-pageinfo').textContent = '';
    $('recipes-prev').disabled = true;
    $('recipes-next').disabled = true;
    return;
  }
  
  // 生命阶段映射（统一为幼年期/成年期，兼容旧数据）
  const lifeStageMap = { 
    puppy: '幼年期', 
    adult: '成年期',
    // 兼容旧数据，但显示时统一归类
    senior: '成年期', 
    pregnancy: '成年期', 
    lactation: '成年期' 
  };
  const recipeTypeMap = { standard: '通用食谱', custom: '定制食谱' };
  
  list.innerHTML = pageItems.map(recipe => {
    const lifeStage = lifeStageMap[recipe.lifeStage] || recipe.lifeStage || '-';
    const recipeType = recipeTypeMap[recipe.recipeType] || (recipe.isCustom ? '定制食谱' : '通用食谱');
    const code = recipe.code || '-';
    const software = recipe.software || '-';
    return `
      <div class="list-item" data-id="${recipe.id}">
        <div class="list-item-row" style="grid-template-columns: 1fr 0.8fr 1fr 1.2fr 0.8fr 0.8fr;">
          <div>${code}</div>
          <div>${recipe.name || '-'}</div>
          <div>${lifeStage}</div>
          <div>${software}</div>
          <div>${recipe.nutritionStandard || '-'}</div>
          <div>${recipeType}</div>
        </div>
        <div class="item-actions">
          <button class="btn small" data-detail="${recipe.id}">详细信息</button>
          <button class="btn small" data-edit="${recipe.id}">编辑</button>
          <button class="btn small" data-copy="${recipe.id}">复制</button>
          <button class="btn small" data-del="${recipe.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  // 绑定详细信息按钮
  list.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.detail;
      const wrap = list.querySelector(`.list-item[data-id="${id}"]`);
      const existing = wrap.querySelector('.item-details');
      if (existing) {
        existing.remove();
        return;
      }
      const recipe = store.recipes.find(x => x.id === id);
      if (!recipe) return;
      wrap.insertAdjacentHTML('beforeend', formatRecipeDetails(recipe));
      
      // 异步查询并更新标记的食材（包括营养补充剂和普通食材）
      const detailsEl = wrap.querySelector('.item-details');
      if (detailsEl) {
        // 查找所有需要查询的项目（包括旧的data-supplement-query和新的data-ingredient-query）
        const supplementQueries = detailsEl.querySelectorAll('[data-supplement-query]');
        const ingredientQueries = detailsEl.querySelectorAll('[data-ingredient-query]');
        const allQueries = Array.from(supplementQueries).concat(Array.from(ingredientQueries));
        
        if (allQueries.length > 0) {
          (async () => {
            // 计算总重量（用于计算N值）
            let totalWeightForPercent = 0;
            recipe.ingredients.forEach(item => {
              const unit = item.unit || 'g';
              const weight = parseFloat(item.weight) || 0;
              // 只计算单位为g的食材
              if (unit === 'g') {
                totalWeightForPercent += weight;
              }
            });
            const effectiveTotalWeight = totalWeightForPercent > 0 ? totalWeightForPercent : (recipe.totalWeight || 0);
            
            // 并行查询所有标记的食材（先尝试营养补充剂，再尝试普通食材）
            const queries = allQueries.map(async (el) => {
              // 获取食材名称（支持两种data属性）
              const ingredientName = el.getAttribute('data-supplement-query') || el.getAttribute('data-ingredient-query');
              if (!ingredientName) return;
              
              console.log(`[formatRecipeDetails] 开始查询食材: "${ingredientName}"`);
              
              try {
                // 先尝试查询是否为营养补充剂
                let found = null;
                let classification = null;
                
                // 1. 先查询营养补充剂
                const supplementParams = new URLSearchParams({
                  search: ingredientName,
                  classification: '营养补充剂',
                  pageSize: 10
                });
                const supplementResponse = await backendRequest(`/api/v1/ingredients?${supplementParams.toString()}`);
                
                console.log(`[formatRecipeDetails] 查询营养补充剂 "${ingredientName}" 的API响应:`, {
                  itemsCount: supplementResponse.items?.length || 0,
                  items: supplementResponse.items?.map(i => ({ name: i.name, id: i.id })) || []
                });
                
                // 在返回结果中精确匹配名称
                if (supplementResponse.items && supplementResponse.items.length > 0) {
                  // 先尝试精确匹配
                  found = supplementResponse.items.find(item => item.name === ingredientName);
                  
                  // 如果精确匹配没找到，尝试去掉空格后匹配
                  if (!found) {
                    const normalizedName = ingredientName.replace(/\s+/g, '');
                    found = supplementResponse.items.find(item => {
                      const itemName = (item.name || '').replace(/\s+/g, '');
                      return itemName === normalizedName;
                    });
                  }
                  
                  // 如果还是没找到，尝试模糊匹配
                  if (!found) {
                    found = supplementResponse.items.find(item => {
                      const itemName = (item.name || '').trim();
                      const searchName = ingredientName.trim();
                      return itemName === searchName || 
                             itemName.includes(searchName) || 
                             searchName.includes(itemName);
                    });
                  }
                  
                  if (found) {
                    classification = '营养补充剂';
                  }
                }
                
                // 2. 如果不是营养补充剂，再查询普通食材
                if (!found) {
                  const ingredientParams = new URLSearchParams({
                    search: ingredientName,
                    classification: '食材',
                    pageSize: 10
                  });
                  const ingredientResponse = await backendRequest(`/api/v1/ingredients?${ingredientParams.toString()}`);
                  
                  console.log(`[formatRecipeDetails] 查询食材 "${ingredientName}" 的API响应:`, {
                    itemsCount: ingredientResponse.items?.length || 0,
                    items: ingredientResponse.items?.map(i => ({ name: i.name, id: i.id })) || []
                  });
                  
                  if (ingredientResponse.items && ingredientResponse.items.length > 0) {
                    // 先尝试精确匹配
                    found = ingredientResponse.items.find(item => item.name === ingredientName);
                    
                    // 如果精确匹配没找到，尝试去掉空格后匹配
                    if (!found) {
                      const normalizedName = ingredientName.replace(/\s+/g, '');
                      found = ingredientResponse.items.find(item => {
                        const itemName = (item.name || '').replace(/\s+/g, '');
                        return itemName === normalizedName;
                      });
                    }
                    
                    // 如果还是没找到，尝试模糊匹配
                    if (!found) {
                      found = ingredientResponse.items.find(item => {
                        const itemName = (item.name || '').trim();
                        const searchName = ingredientName.trim();
                        return itemName === searchName || 
                               itemName.includes(searchName) || 
                               searchName.includes(itemName);
                      });
                    }
                    
                    if (found) {
                      classification = '食材';
                    }
                  }
                }
                
                // 3. 如果找到了，根据分类更新显示
                if (found && classification) {
                  console.log(`[formatRecipeDetails] 找到${classification === '营养补充剂' ? '营养补充剂' : '食材'} "${ingredientName}":`, {
                    name: found.name,
                    classification: classification,
                    unitContent: found.unitContent,
                    nutrientUnit: found.nutrientUnit,
                    mainNutrient: found.mainNutrient
                  });
                  
                  // 添加到缓存
                  const ingredientId = `ing_${found.id}`;
                  const cachedIngredient = {
                    id: ingredientId,
                    name: found.name,
                    classification: classification,
                    unit: found.unit || 'g',
                    _backendId: found.id
                  };
                  
                  if (classification === '营养补充剂') {
                    cachedIngredient.unitContent = found.unitContent;
                    cachedIngredient.nutrientUnit = found.nutrientUnit;
                    cachedIngredient.mainNutrient = found.mainNutrient;
                  }
                  ingredientCache.set(ingredientId, cachedIngredient);
                  
                  // 查找对应的食材项，获取用量
                  const recipeItem = recipe.ingredients.find(ri => ri.ingredientName === ingredientName);
                  console.log(`[formatRecipeDetails] 查找食谱中的食材项 "${ingredientName}":`, {
                    found: !!recipeItem,
                    recipeItem: recipeItem ? { ingredientName: recipeItem.ingredientName, weight: recipeItem.weight, unit: recipeItem.unit } : null
                  });
                  
                  if (classification === '营养补充剂') {
                    // 营养补充剂：显示每100g饭量添加的营养素
                    if (recipeItem && effectiveTotalWeight > 0) {
                      const unitContent = parseFloat(found.unitContent) || 0;
                      const nutrientUnit = found.nutrientUnit || '';
                      const mainNutrient = found.mainNutrient || '';
                      const itemWeight = parseFloat(recipeItem.weight) || 0;
                      
                      console.log(`[formatRecipeDetails] 计算N值:`, {
                        unitContent,
                        itemWeight,
                        effectiveTotalWeight,
                        calculatedN: (itemWeight * unitContent / effectiveTotalWeight) * 100
                      });
                      
                      if (unitContent > 0 && itemWeight > 0) {
                        const N = Math.round((itemWeight * unitContent / effectiveTotalWeight) * 100);
                        if (N > 0) {
                          if (nutrientUnit && mainNutrient) {
                            el.textContent = `每100g饭量添加 ${N} ${nutrientUnit} ${mainNutrient}`;
                          } else if (nutrientUnit) {
                            el.textContent = `每100g饭量添加 ${N} ${nutrientUnit}`;
                          } else if (mainNutrient) {
                            el.textContent = `每100g饭量添加 ${N} ${mainNutrient}`;
                          } else {
                            el.textContent = `每100g饭量添加 ${N} 单位营养素`;
                          }
                          el.removeAttribute('data-supplement-query');
                          el.removeAttribute('data-ingredient-query');
                          el.style.color = 'var(--text-secondary)';
                          console.log(`[formatRecipeDetails] 成功更新营养补充剂 "${ingredientName}" 的显示`);
                          return;
                        } else {
                          console.warn(`[formatRecipeDetails] 营养补充剂 "${ingredientName}" 计算出的N为0或负数`);
                        }
                      } else {
                        console.warn(`[formatRecipeDetails] 营养补充剂 "${ingredientName}" 数据不完整:`, {
                          unitContent,
                          itemWeight
                        });
                      }
                    } else {
                      console.warn(`[formatRecipeDetails] 未找到食谱中的食材项或总重量为0:`, {
                        recipeItemFound: !!recipeItem,
                        effectiveTotalWeight
                      });
                    }
                  } else if (classification === '食材') {
                    // 食材：显示重量占比
                    if (recipeItem && effectiveTotalWeight > 0) {
                      const unit = recipeItem.unit || 'g';
                      const weight = parseFloat(recipeItem.weight) || 0;
                      
                      if (unit === 'g' && weight > 0) {
                        const weightPercent = ((weight / effectiveTotalWeight) * 100).toFixed(2);
                        el.textContent = `${weightPercent}%`;
                        el.removeAttribute('data-supplement-query');
                        el.removeAttribute('data-ingredient-query');
                        el.style.color = 'var(--text-secondary)';
                        console.log(`[formatRecipeDetails] 成功更新食材 "${ingredientName}" 的显示`);
                        return;
                      }
                    }
                  }
                } else {
                  console.warn(`[formatRecipeDetails] 未找到食材 "${ingredientName}"`);
                }
                
                // 如果查询失败或数据不完整，显示"-"
                el.textContent = '-';
                el.removeAttribute('data-supplement-query');
                el.removeAttribute('data-ingredient-query');
              } catch (error) {
                console.error(`[formatRecipeDetails] 无法查询食材 "${ingredientName}":`, error);
                el.textContent = '-';
                el.removeAttribute('data-supplement-query');
                el.removeAttribute('data-ingredient-query');
              }
            });
            
            await Promise.all(queries);
          })();
        }
      }
    });
  });
  
  // 绑定编辑按钮
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      openRecipeForm(btn.dataset.edit);
      const formCard = $('recipe-form-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  
  // 绑定复制按钮
  list.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.copy;
      copyRecipe(id);
    });
  });
  
  // 绑定删除按钮
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteRecipe(btn.dataset.del));
  });
  
  $('recipes-total').textContent = `共 ${total} 条`;
  $('recipes-pageinfo').textContent = `第 ${store.recipePage}/${totalPages} 页`;
  $('recipes-prev').disabled = store.recipePage <= 1;
  $('recipes-next').disabled = store.recipePage >= totalPages;
}

// 复制食谱
function copyRecipe(id) {
  const recipe = store.recipes.find(x => x.id === id);
  if (!recipe) {
    alert('食谱不存在');
    return;
  }
  
  // 创建副本数据
  const copiedRecipe = {
    ...recipe,
    id: '', // 清空ID，作为新食谱
    name: (recipe.name || '') + '（副本）',
    code: '', // 清空编号，会自动生成新编号
    createdAt: Date.now(),
    updatedAt: Date.now(),
    _backendId: undefined // 清空后端ID
  };
  
  // 打开表单并填充副本数据
  openRecipeForm(null, copiedRecipe);
  
  // 滚动到表单
  const formCard = $('recipe-form-card');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 打开食谱表单
function openRecipeForm(id = null, recipeData = null) {
  const card = $('recipe-form-card');
  const title = $('recipe-form-title');
  const form = $('recipe-form');
  
  if (!card || !form) return;
  
  // 如果提供了recipeData（复制场景），使用它；否则根据id查找
  let recipe = null;
  if (recipeData) {
    recipe = recipeData;
  } else if (id) {
    recipe = store.recipes.find(x => x.id === id);
    if (!recipe) return;
  }
  
  if (recipe) {
    // 如果是复制场景（没有id或id为空），显示"新增食谱"；否则显示"编辑食谱"
    if (title) {
      title.textContent = (recipe.id && recipe.id.trim()) ? '编辑食谱' : '新增食谱（复制）';
    }
    $('recipe-id').value = recipe.id || '';
    $('r-name').value = recipe.name || '';
    $('r-lifeStage').value = recipe.lifeStage || recipe.targetGroup || 'adult';
    $('r-nutritionStandard').value = recipe.nutritionStandard || 'FEDIAF';
    
    $('r-software').value = recipe.software || 'ADF';
    // 兼容旧数据
    if (recipe.recipeType) {
      $('r-recipeType').value = recipe.recipeType;
    } else {
      $('r-recipeType').value = recipe.isCustom === true ? 'custom' : 'standard';
    }
    
    // 设置编号（复制场景或没有编号时自动生成）
    if (recipe.code && recipe.id && recipe.id.trim()) {
      // 编辑现有食谱且有编号，显示原编号
      $('r-code').value = recipe.code;
    } else {
      // 复制场景或新食谱，自动生成编号
      autoGenerateRecipeCode();
    }
    
    // 设置制作损耗、售价、基础价格、默认份数
    $('r-cookingLoss').value = recipe.cookingLoss != null ? recipe.cookingLoss : 7;
    // 设置描述
    const descEl = $('r-description');
    if (descEl) {
      descEl.value = recipe.description || '';
    }
    
    // 设置制作流程
    currentRecipeCookingSteps = Array.isArray(recipe.cookingSteps) ? [...recipe.cookingSteps] : [];
    renderRecipeCookingSteps();
    
    // 设置食材列表（兼容旧数据：如果有ingredientId，尝试从store中获取名称；如果有ingredientName，直接使用）
    console.log('[openRecipeForm] 原始recipe.ingredients:', recipe.ingredients);
    currentRecipeIngredients = (recipe.ingredients || []).map(item => {
      let ingredientName = '';
      // 检查 ingredientName 是否存在且不为空（包括空字符串的情况）
      if (item.ingredientName != null && item.ingredientName !== '') {
        // 新格式：直接使用ingredientName
        ingredientName = String(item.ingredientName).trim();
      } else if (item.ingredientId) {
        // 旧格式：从store中查找食材名称（兼容旧数据）
        const ing = store.ingredients.find(i => {
          if (typeof item.ingredientId === 'number') {
            return i._backendId === item.ingredientId;
          } else if (typeof item.ingredientId === 'string') {
            return i.id === item.ingredientId || i._backendId === parseInt(item.ingredientId.replace('ing_', ''), 10);
          }
          return false;
        });
        ingredientName = ing ? (ing.name || '') : '';
      }
      return {
        ingredientName: ingredientName, // 只保存食材名称
        weight: item.weight,
        unit: item.unit || 'g'
      };
    }).filter(item => item.ingredientName); // 过滤掉没有名称的项
    console.log('[openRecipeForm] 处理后的currentRecipeIngredients:', currentRecipeIngredients);
    renderRecipeIngredientsList();
    
    // 设置营养数据
    $('r-protein').value = recipe.protein != null ? recipe.protein : '';
    $('r-fat').value = recipe.fat != null ? recipe.fat : '';
    $('r-carb').value = recipe.carb != null ? recipe.carb : '';
    $('r-fiber').value = recipe.fiber != null ? recipe.fiber : '';
    $('r-ash').value = recipe.ash != null ? recipe.ash : '';
    $('r-moisture').value = recipe.moisture != null ? recipe.moisture : '';
    // 兼容 caRatio（后端）和 caPratio（旧数据）
    $('r-caPratio').value = (recipe.caRatio || recipe.caPratio) != null ? (recipe.caRatio || recipe.caPratio) : '';
    $('r-totalKcal').value = recipe.totalKcal != null ? recipe.totalKcal : '';
    
    // 先计算总重量（使用新逻辑重新计算，而不是使用服务器端存储的旧值）
    // 这样可以确保显示的是根据当前食材列表重新计算的值
    calculateRecipeTotalWeight();
    
    // 热量密度会在 calculateRecipeTotalWeight() 中自动计算
    // 但如果服务器端有存储的值且计算失败，可以保留作为后备
    if (!$('r-kcalDensity').value) {
      $('r-kcalDensity').value = recipe.kcalDensity != null ? parseFloat(recipe.kcalDensity).toFixed(2) : '';
    }
  } else {
    if (title) title.textContent = '新增食谱';
    form.reset();
    $('recipe-id').value = '';
    $('r-nutritionStandard').value = 'FEDIAF';
    $('r-software').value = 'ADF';
    $('r-recipeType').value = 'standard';
    $('r-cookingLoss').value = 7;
    const descEl = $('r-description');
    if (descEl) {
      descEl.value = '';
    }
    selectedIngredientId = null;
    editingIngredientIndex = null;
    const searchInput = $('r-ingredient-search');
    if (searchInput) searchInput.value = '';
    currentRecipeIngredients = [];
    currentRecipeCookingSteps = [];
    renderRecipeIngredientsList();
    renderRecipeCookingSteps();
    $('r-totalWeight').value = '';
    $('r-kcalDensity').value = '';
    
    // 自动生成编号
    autoGenerateRecipeCode();
  }
  
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 删除食谱
async function deleteRecipe(id) {
  if (!confirm('确定要删除这个食谱吗？')) return;
  
  const recipe = store.recipes.find(x => x.id === id);
  if (!recipe) return;
  
  // 获取删除按钮，添加加载状态
  const deleteBtn = document.querySelector(`[data-del="${id}"]`);
  const originalBtnText = deleteBtn ? deleteBtn.textContent : '';
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.textContent = '删除中...';
  }
  
  // 如果有后端ID，调用后端API删除
  if (backendState.token && recipe._backendId) {
    try {
      await backendRequest(`/api/v1/recipes/${recipe._backendId}`, {
        method: 'DELETE'
      });
      console.log('✓ 食谱已从后端删除');
      await loadRecipesFromBackend();
      
      // 恢复按钮状态
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = originalBtnText;
      }
    } catch (error) {
      console.error('删除食谱失败:', error);
      alert('删除食谱失败: ' + (error.message || '未知错误'));
      
      // 恢复按钮状态
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = originalBtnText;
      }
      return;
    }
  } else {
    // 本地数据：从store中删除
    const idx = store.recipes.findIndex(x => x.id === id);
    if (idx >= 0) {
      store.recipes.splice(idx, 1);
      saveApp();
      renderRecipesList();
    }
    
    // 恢复按钮状态
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.textContent = originalBtnText;
    }
  }
}
// 设置食谱模块
function setupRecipesModule() {
  const newBtn = $('btn-new-recipe');
  if (newBtn) newBtn.addEventListener('click', () => openRecipeForm());
  
  const cancelBtn = $('btn-cancel-recipe');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const card = $('recipe-form-card');
      if (card) card.style.display = 'none';
      selectedIngredientId = null;
      editingIngredientIndex = null;
      const searchInput = $('r-ingredient-search');
      if (searchInput) searchInput.value = '';
      const weightInput = $('r-ingredient-weight');
      if (weightInput) weightInput.value = '';
      const resultsEl = $('r-ingredient-search-results');
      if (resultsEl) resultsEl.style.display = 'none';
    });
  }
  
  // 原料搜索功能
  const searchInput = $('r-ingredient-search');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchIngredients(e.target.value);
      }, 300); // 防抖，300ms后执行
    });
    
    // 点击外部关闭搜索结果
    document.addEventListener('click', (e) => {
      const resultsEl = $('r-ingredient-search-results');
      if (resultsEl && !resultsEl.contains(e.target) && e.target !== searchInput) {
        resultsEl.style.display = 'none';
      }
    });
  }
  
  // 添加食材按钮
  const addIngredientBtn = $('btn-add-ingredient');
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', addIngredientToRecipe);
  }
  
  // 回车键添加食材
  const weightInput = $('r-ingredient-weight');
  if (weightInput) {
    weightInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addIngredientToRecipe();
      }
    });
  }
  
  // 总热量变化时重新计算热量密度
  const totalKcalEl = $('r-totalKcal');
  if (totalKcalEl) {
    totalKcalEl.addEventListener('input', calculateRecipeKcalDensity);
  }
  
  // 生命阶段、营养标准、食谱类型变化时自动生成编号
  const codeFields = ['r-lifeStage', 'r-nutritionStandard', 'r-recipeType'];
  codeFields.forEach(fieldId => {
    const fieldEl = $(fieldId);
    if (fieldEl) {
      fieldEl.addEventListener('change', () => {
        // 如果是新增食谱，自动生成编号
        if (!$('recipe-id').value) {
          autoGenerateRecipeCode();
        }
      });
    }
  });
  
  // 搜索和筛选
  const searchEl = $('recipe-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      store.recipePage = 1;
      if (backendState.token) {
        loadRecipesFromBackend();
      } else {
        renderRecipesList();
      }
    });
  }
  
  const lifeStageFilterEl = $('recipe-lifeStage-filter');
  if (lifeStageFilterEl) {
    lifeStageFilterEl.addEventListener('change', () => {
      store.recipePage = 1;
      if (backendState.token) {
        loadRecipesFromBackend();
      } else {
        renderRecipesList();
      }
    });
  }
  
  const customFilterEl = $('recipe-custom-filter');
  if (customFilterEl) {
    customFilterEl.addEventListener('change', () => {
      store.recipePage = 1;
      if (backendState.token) {
        loadRecipesFromBackend();
      } else {
        renderRecipesList();
      }
    });
  }
  
  // 分页
  const prevBtn = $('recipes-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', async () => {
      if (store.recipePage > 1) {
        store.recipePage--;
        if (backendState.token) {
          await loadRecipesFromBackend();
        } else {
          renderRecipesList();
        }
      }
    });
  }
  
  const nextBtn = $('recipes-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      const { totalPages } = paginatedRecipes();
      if (store.recipePage < totalPages) {
        store.recipePage++;
        if (backendState.token) {
          await loadRecipesFromBackend();
        } else {
          renderRecipesList();
        }
      }
    });
  }
  
  // 制作流程管理
  const addStepBtn = $('btn-add-cooking-step');
  if (addStepBtn) {
    addStepBtn.addEventListener('click', addCookingStep);
  }
  
  // 表单提交
  const form = $('recipe-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = $('recipe-id').value;
      const name = $('r-name').value.trim();
      
      if (!name) {
        alert('请填写食谱名称');
        return;
      }
      
      // 验证食材列表不能为空
      if (!currentRecipeIngredients || currentRecipeIngredients.length === 0) {
        alert('请至少添加一个食材');
        return;
      }
      
      // 验证食材名称有效性（如果有后端连接）
      // 注意：现在只保存 ingredientName，不保存 ingredientId
      if (backendState.token) {
        const invalidIngredients = [];
        for (const item of currentRecipeIngredients) {
          // 验证食材名称是否存在且不为空
          if (!item.ingredientName || !item.ingredientName.trim()) {
            invalidIngredients.push('存在无效的食材名称');
            break;
          }
          // 验证重量是否有效
          if (!item.weight || item.weight <= 0) {
            invalidIngredients.push(`食材"${item.ingredientName}"的重量无效`);
            break;
          }
        }
        if (invalidIngredients.length > 0) {
          alert('食材验证失败：' + invalidIngredients.join('、'));
          return;
        }
      }
      
      // 获取提交按钮，添加加载状态（在验证通过后）
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '保存中...';
      }
      
      // 验证钙磷比格式
      const caPratioInput = $('r-caPratio').value.trim();
      let caRatio = null;
      if (caPratioInput) {
        // 验证格式：数字:数字，如 1.2:1
        const ratioPattern = /^[0-9]+(\.[0-9]+)?:[0-9]+(\.[0-9]+)?$/;
        if (!ratioPattern.test(caPratioInput)) {
          alert('钙磷比格式不正确，请输入如 1.2:1 的格式');
          return;
        }
        caRatio = caPratioInput;
      }
      
      // 计算总重量
      calculateRecipeTotalWeight();
      const totalWeight = parseFloat($('r-totalWeight').value) || 0;
      
      // 计算热量密度
      calculateRecipeKcalDensity();
      const kcalDensity = parseFloat($('r-kcalDensity').value) || 0;
      
      // 自动生成编号
      autoGenerateRecipeCode();
      const code = $('r-code').value.trim();
      
      const payload = {
        code: code || null,
        name: name,
        description: $('r-description')?.value?.trim() || null,
        lifeStage: $('r-lifeStage').value || 'adult',
        nutritionStandard: $('r-nutritionStandard').value || 'FEDIAF',
        software: $('r-software').value || 'ADF',
        recipeType: $('r-recipeType').value || 'standard',
        ingredients: (() => {
          const ingredientsToSave = currentRecipeIngredients.map(item => {
            // 只保存食材名称，不保存ID
            return {
              ingredientName: item.ingredientName || '', // 只保存食材名称
              weight: item.weight,
              unit: item.unit || 'g'
            };
          });
          console.log('[saveRecipe] 准备保存的食材数据:', ingredientsToSave);
          console.log('[saveRecipe] currentRecipeIngredients 长度:', currentRecipeIngredients.length);
          return ingredientsToSave;
        })(),
        protein: $('r-protein').value ? parseFloat($('r-protein').value) : null,
        fat: $('r-fat').value ? parseFloat($('r-fat').value) : null,
        carb: $('r-carb').value ? parseFloat($('r-carb').value) : null,
        fiber: $('r-fiber').value ? parseFloat($('r-fiber').value) : null,
        ash: $('r-ash').value ? parseFloat($('r-ash').value) : null,
        moisture: $('r-moisture').value ? parseFloat($('r-moisture').value) : null,
        caRatio: caRatio,
        totalKcal: $('r-totalKcal').value ? parseFloat($('r-totalKcal').value) : null,
        totalWeight: totalWeight > 0 ? totalWeight : null,
        kcalDensity: kcalDensity > 0 ? kcalDensity : null,
        cookingLoss: parseInt($('r-cookingLoss').value) || 7,
        cookingSteps: currentRecipeCookingSteps
          .map((step, index) => {
            // 处理不同格式的步骤数据
            const description = typeof step === 'string' ? step : (step.description || '');
            return {
              stepOrder: (typeof step === 'object' && step.stepOrder) ? step.stepOrder : (index + 1),
              description: description
            };
          })
          .filter(step => step.description && step.description.trim()) // 过滤掉空的步骤描述
      };
      
      console.log('[saveRecipe] 完整的 payload:', JSON.stringify(payload, null, 2));
      
      // 如果有后端ID，调用更新API；否则调用创建API
      if (backendState.token) {
        try {
          const recipe = id ? store.recipes.find(x => x.id === id) : null;
          const backendId = recipe?._backendId;
          
          if (backendId) {
            // 更新
            await backendRequest(`/api/v1/recipes/${backendId}`, {
              method: 'PUT',
              body: JSON.stringify(payload)
            });
            console.log('✓ 食谱已更新到后端');
          } else {
            // 创建
            await backendRequest('/api/v1/recipes', {
              method: 'POST',
              body: JSON.stringify(payload)
            });
            console.log('✓ 食谱已保存到后端');
          }
          
          // 重新加载列表
          await loadRecipesFromBackend();
          
          // 关闭表单
          const card = $('recipe-form-card');
          if (card) card.style.display = 'none';
          
          // 恢复按钮状态
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
        } catch (error) {
          console.error('保存食谱失败:', error);
          alert('保存食谱失败: ' + (error.message || '未知错误'));
          
          // 恢复按钮状态
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
        }
      } else {
        // 本地数据：保存到store
        const record = {
          id: id || genId(),
          ...payload,
          caPratio: caRatio, // 兼容旧字段名
          updatedAt: Date.now()
        };
        
        const existsIdx = store.recipes.findIndex(x => x.id === record.id);
        if (existsIdx >= 0) {
          record.createdAt = store.recipes[existsIdx].createdAt;
          store.recipes.splice(existsIdx, 1, record);
        } else {
          record.createdAt = Date.now();
          store.recipes.unshift(record);
        }
        
        saveApp();
        const card = $('recipe-form-card');
        if (card) card.style.display = 'none';
        renderRecipesList();
        
        // 恢复按钮状态
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });
  }
  
  // 初始渲染：如果已登录，从后端加载；否则使用本地数据
  if (backendState.token) {
    loadRecipesFromBackend();
  } else {
    renderRecipesList();
  }
}

// 暴露给全局
window.openRecipeForm = openRecipeForm;
window.deleteRecipe = deleteRecipe;

function setupNav() {
  console.log('[setupNav] 开始设置导航...');
  const navButtons = document.querySelectorAll('.nav-btn');
  console.log('[setupNav] 找到导航按钮数量:', navButtons.length);
  
  navButtons.forEach((btn, index) => {
    const view = btn.dataset.view;
    console.log(`[setupNav] 按钮 ${index}: view=${view}, text=${btn.textContent}`);
    btn.addEventListener('click', (e) => {
      console.log('[setupNav] 点击了导航按钮:', view);
      e.preventDefault();
      e.stopPropagation();
      if (view) {
        switchView(view);
      } else {
        console.warn('[setupNav] 按钮没有 data-view 属性:', btn);
      }
    });
  });
  
  console.log('[setupNav] 导航设置完成');
}

function setupPWA() {
  // PWA安装功能已移除
  // 保留函数以避免调用错误
}

// 渲染备份列表
function renderBackupsList() {
  const listEl = $('backups-list');
  if (!listEl) return;
  
  const backups = getBackups();
  
  if (backups.length === 0) {
    listEl.innerHTML = '<div class="muted" style="text-align:center; padding:20px;">暂无备份记录</div>';
    return;
  }
  
  listEl.innerHTML = backups.map(backup => {
    const timeAgo = getTimeAgo(backup.timestamp);
    return `
      <div style="padding:12px; border:0.5px solid var(--border); border-radius:8px; background:var(--surface-elevated);">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
          <div style="flex:1;">
            <div style="font-weight:500; color:var(--text-primary); margin-bottom:4px;">${backup.date}</div>
            <div style="font-size:12px; color:var(--text-secondary);">
              顾客: ${backup.customersCount} 条 | 原料: ${backup.ingredientsCount} 条 | 食谱: ${backup.recipesCount || 0} 条 | 订单: ${backup.ordersCount || 0} 条 | ${timeAgo}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn small" onclick="restoreBackup('${backup.id}')" style="font-size:12px;">恢复</button>
            <button class="btn small" onclick="deleteBackupAndRefresh('${backup.id}')" style="font-size:12px;">删除</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 获取相对时间
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

// 删除备份并刷新列表
function deleteBackupAndRefresh(backupId) {
  if (confirm('确定要删除这个备份吗？')) {
    if (deleteBackup(backupId)) {
      renderBackupsList();
    }
  }
}

// 暴露给全局
window.restoreBackup = restoreBackup;
window.deleteBackupAndRefresh = deleteBackupAndRefresh;

// ========== 订单管理模块 ==========

// 当前编辑订单的食谱列表（临时存储）
let currentOrderRecipes = [];

// 订单中食谱录入的临时数据（纯食谱定制类型使用）
let currentOrderRecipeIngredients = [];
let currentOrderRecipeCookingSteps = [];
let selectedOrderRecipeIngredientId = null;
let editingOrderRecipeIngredientIndex = null;

// 鲜食制作类型的临时数据
let currentFoodMakingRecipeId = null;
let currentFoodMakingDays = 1;
let currentFoodMakingPackaging = []; // 包装清单 [{name, quantity, unit, cost}]
let currentFoodMakingShippingType = 'remote';
let latestFoodMakingAutoPrice = 0;
let manualFoodMakingOrderPrice = null;

function getOrderTypeLabel(orderType) {
  const select = $('o-orderType');
  if (select && select.tagName === 'SELECT' && select.options) {
    try {
      const option = Array.from(select.options).find(opt => opt.value === orderType);
      if (option) {
        return option.textContent.trim();
      }
    } catch (err) {
      console.warn('获取订单类型标签失败:', err);
    }
  }
  const fallback = {
    recipe_only: '食谱定制',
    food_making: '鲜食制作',
    both: '食谱定制+鲜食制作'
  };
  return fallback[orderType] || '';
}

// 生成订单编号
// 规则：订单类型拼音首字母集 + 日期(YYYYMMDD) + 4位序号
function generateOrderNumber(orderType, orderDate, excludeId = null) {
  let prefix = 'SPDZ';
  if (orderType === 'food_making') {
    prefix = 'XSZZ';
  } else if (orderType === 'both') {
    prefix = 'DZZZ';
  }
  const dateStr = (orderDate || '').replace(/\D/g, '');
  
  // 找到相同前缀和日期的所有订单，计算下一个序号
  const samePrefixDate = store.orders.filter(order => {
    if (excludeId && order.id === excludeId) return false;
    if (!order.orderNumber) return false;
    return order.orderNumber.startsWith(prefix + dateStr);
  });
  
  // 找到最大序号
  let maxNum = 0;
  samePrefixDate.forEach(order => {
    if (order.orderNumber) {
      const match = order.orderNumber.match(new RegExp(`^${prefix}${dateStr}(\\d{4})$`));
      if (match) {
        const num = parseInt(match[1], 10);
        maxNum = Math.max(maxNum, num);
      }
    }
  });
  
  const nextNum = maxNum + 1;
  return prefix + dateStr + String(nextNum).padStart(4, '0');
}

// 自动生成订单编号
function autoGenerateOrderNumber() {
  const orderType = $('o-orderType').value;
  let orderDate = $('o-orderDate').value;
  
  // 如果订单日期为空，自动设置为当前日期
  if (!orderDate) {
    orderDate = new Date().toISOString().split('T')[0];
    if ($('o-orderDate')) {
      $('o-orderDate').value = orderDate;
    }
  }
  
  // 如果订单类型为空，不生成编号
  if (!orderType || !orderDate) {
    const numberEl = $('o-orderNumber');
    if (numberEl) numberEl.value = '';
    const numberField = $('order-number-field');
    if (numberField) numberField.style.display = 'none';
    return;
  }
  
  const orderId = $('order-id').value || null;
  const number = generateOrderNumber(orderType, orderDate, orderId);
  const numberEl = $('o-orderNumber');
  if (numberEl) numberEl.value = number;
  const numberField = $('order-number-field');
  if (numberField) numberField.style.display = 'block';
}

// 根据订单类型显示/隐藏不同的内容区域
function toggleOrderTypeContent() {
  const orderType = $('o-orderType').value;
  const form = $('order-form');
  
  // 隐藏所有类型的内容
  const recipeOnlyContent = $('order-recipe-only-content');
  const foodMakingContent = $('order-food-making-content');
  const bothContent = $('order-both-content');
  const amountSection = $('order-amount-section');
  
  // 先移除所有隐藏区域的required属性，避免验证错误
  if (recipeOnlyContent) {
    const recipeOnlyFields = recipeOnlyContent.querySelectorAll('[required]');
    recipeOnlyFields.forEach(field => {
      field.removeAttribute('required');
    });
  }
  
  if (recipeOnlyContent) recipeOnlyContent.style.display = 'none';
  if (foodMakingContent) foodMakingContent.style.display = 'none';
  if (bothContent) bothContent.style.display = 'none';
  if (amountSection) amountSection.style.display = 'none';
  
  // 根据订单类型显示对应的内容
  if (orderType === 'recipe_only') {
    if (recipeOnlyContent) {
      recipeOnlyContent.style.display = 'block';
      // 恢复必填字段的required属性
      const recipeNameField = $('or-name');
      const cookingLossField = $('or-cookingLoss');
      if (recipeNameField) recipeNameField.setAttribute('required', 'required');
      if (cookingLossField) cookingLossField.setAttribute('required', 'required');
    }
    if (amountSection) amountSection.style.display = 'block';
    
    // 如果是新增订单，自动生成食谱编号
    if (!$('order-id').value) {
      autoGenerateOrderRecipeCode();
    }
  } else if (orderType === 'food_making') {
    if (foodMakingContent) foodMakingContent.style.display = 'block';
  } else if (orderType === 'both') {
    if (bothContent) bothContent.style.display = 'block';
  }
  
  // 如果订单类型已选择，自动生成订单编号（订单创建日期会自动设置）
  if (orderType) {
    // 确保订单创建日期有值
    if (!$('o-orderDate').value) {
      const today = new Date().toISOString().split('T')[0];
      $('o-orderDate').value = today;
    }
    autoGenerateOrderNumber();
  }
}
// 显示顾客信息表格
function renderOrderCustomerInfo(customerId) {
  const infoEl = $('order-customer-info');
  const tableEl = $('order-customer-info-table');
  
  if (!infoEl || !tableEl) return;
  
  if (!customerId) {
    infoEl.style.display = 'none';
    return;
  }
  
  const customer = store.customers.find(c => c.id === customerId);
  if (!customer) {
    infoEl.style.display = 'none';
    return;
  }
  
  const years = calcAgeYears(customer.birthday);
  const showAge = customer.lifeStage === 'adult' || customer.lifeStage === 'pregnancy' || customer.lifeStage === 'lactation';
  const showPuppy = customer.lifeStage === 'puppy';
  const showLact = customer.lifeStage === 'lactation';
  
  let html = `
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500; width:120px;">宠物昵称</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.petName || '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500; width:120px;">品种</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.breed || '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">微信号</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.wechat || '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">收货信息</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.address || '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">生日</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.birthday || '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">体重</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.weightKg != null ? customer.weightKg + ' kg' : '-'}</td>
      </tr>
      ${showAge && years != null ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">年龄</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${years.toFixed(1)} 岁</td>
        <td colspan="2"></td>
      </tr>
      ` : ''}
      ${showPuppy ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">月龄</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.monthAge != null ? customer.monthAge : '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">月龄系数</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.monthFactor != null ? customer.monthFactor : '-'}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">性别</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.sex, sexMap)}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">是否绝育</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.neutered, neuterMap)}</td>
      </tr>
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">生命阶段</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.lifeStage, lifeMap)}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">活动水平</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.activity, actMap)}</td>
      </tr>
      ${showLact ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">哺乳阶段</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.lactStage, lactMap)}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">产仔数</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.litterCount != null ? customer.litterCount : '-'}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">热量系数</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.kcalFactor != null ? customer.kcalFactor : '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">每日能量估算</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.estKcal != null ? customer.estKcal + ' kcal/日' : '-'}</td>
      </tr>
      ${customer.bcs != null ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">体况评分</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.bcs}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">每日吃几顿饭</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.mealsPerDay != null ? customer.mealsPerDay : '-'}</td>
      </tr>
      ` : ''}
      ${customer.allergies ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">过敏/不耐受</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.allergies}</td>
      </tr>
      ` : ''}
      ${customer.avoid ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">挑食/尽量不吃</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.avoid}</td>
      </tr>
      ` : ''}
      ${customer.fav ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">非常喜欢</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.fav}</td>
      </tr>
      ` : ''}
      ${customer.med ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">症状史/疾病史</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.med}</td>
      </tr>
      ` : ''}
      ${customer.notes ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">备注</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.notes}</td>
      </tr>
      ` : ''}
    </table>
  `;
  
  tableEl.innerHTML = html;
  infoEl.style.display = 'block';
}

// 搜索原料（用于订单中的食谱录入）
function searchIngredientsForOrderRecipe(query) {
  const resultsEl = $('or-ingredient-search-results');
  if (!resultsEl) return;
  
  const q = (query || '').trim().toLowerCase();
  
  if (!q) {
    resultsEl.style.display = 'none';
    selectedOrderRecipeIngredientId = null;
    return;
  }
  
  // 搜索原料（按名称、类别、品牌）
  const matches = store.ingredients.filter(ing => {
    if (!ing.category || !ing.name) return false;
    const name = (ing.name || '').toLowerCase();
    const category = (ing.category || '').toLowerCase();
    const brand = (ing.brand || '').toLowerCase();
    return name.includes(q) || category.includes(q) || brand.includes(q);
  }).slice(0, 10); // 最多显示10个结果
  
  if (matches.length === 0) {
    resultsEl.innerHTML = '<div style="padding:12px; text-align:center; color:var(--text-secondary);">未找到匹配的原料</div>';
    resultsEl.style.display = 'block';
    return;
  }
  
  resultsEl.innerHTML = matches.map(ing => {
    const unit = ing.unit || 'g';
    return `
      <div class="ingredient-search-item" data-id="${ing.id}" style="padding:8px 12px; cursor:pointer; border-bottom:0.5px solid var(--border); transition:background 0.2s;"
           onmouseover="this.style.background='var(--bg-secondary)'"
           onmouseout="this.style.background=''">
        <div style="font-weight:500;">${ing.name || ''}${ing.description ? '-' + ing.description : ''}${ing.brand ? '（' + ing.brand + '）' : ''}</div>
        <div style="font-size:12px; color:var(--text-secondary);">单位: ${unit}</div>
      </div>
    `;
  }).join('');
  
  // 绑定点击事件
  resultsEl.querySelectorAll('.ingredient-search-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const ing = store.ingredients.find(i => i.id === id);
      if (ing) {
        selectedOrderRecipeIngredientId = id;
        const searchInput = $('or-ingredient-search');
        if (searchInput) {
          const name = ing.name || '';
          const description = ing.description || '';
          const brand = ing.brand || '';
          let displayText = name;
          if (description) {
            displayText += '-' + description;
          }
          if (brand) {
            displayText += '（' + brand + '）';
          }
          searchInput.value = displayText;
        }
        resultsEl.style.display = 'none';
      }
    });
  });
  
  resultsEl.style.display = 'block';
}

// 渲染订单中食谱的食材列表
function renderOrderRecipeIngredientsList() {
  const listEl = $('order-recipe-ingredients-list');
  if (!listEl) return;
  
  if (currentOrderRecipeIngredients.length === 0) {
    listEl.innerHTML = '<div class="muted" style="text-align:center; padding:12px;">暂无食材，请添加</div>';
    return;
  }
  
  listEl.innerHTML = currentOrderRecipeIngredients.map((item, idx) => {
    const ing = store.ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return '';
    
    const unit = item.unit || ing.unit || 'g';
    const name = ing.name || '';
    const description = ing.description || '';
    const brand = ing.brand || '';
    let displayText = name;
    if (description) {
      displayText += '-' + description;
    }
    if (brand) {
      displayText += '（' + brand + '）';
    }
    
    const isEditing = editingOrderRecipeIngredientIndex === idx;
    
    return `
      <div class="recipe-ingredient-item" data-index="${idx}" draggable="${!isEditing}" style="display:flex; flex-direction:column; padding:8px; border:0.5px solid var(--border); border-radius:6px; background:var(--bg-secondary); ${isEditing ? 'border:2px solid var(--primary);' : 'cursor:move;'} transition:all 0.2s;"
           onmouseover="${!isEditing ? 'this.style.opacity=\'0.9\'' : ''}" onmouseout="${!isEditing ? 'this.style.opacity=\'1\'' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px; flex:1;">
            <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border-radius:4px; font-weight:600; font-size:14px; color:var(--text-primary); flex-shrink:0;">${idx + 1}</div>
            <div style="flex:1;">
              <div style="font-weight:500;">${displayText}</div>
              ${!isEditing ? `<div style="font-size:12px; color:var(--text-secondary);">${item.weight} ${unit}</div>` : ''}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn small" data-edit-order-ingredient="${idx}" style="font-size:12px;">${isEditing ? '保存' : '编辑'}</button>
            <button type="button" class="btn small" data-remove-order-ingredient="${idx}" style="font-size:12px;">删除</button>
          </div>
        </div>
        ${isEditing ? `
          <div style="margin-top:8px; padding-top:8px; border-top:0.5px solid var(--border);">
            <div style="display:flex; gap:8px; align-items:center;">
              <label style="flex:1; margin:0; font-size:13px;">
                <span style="display:block; margin-bottom:4px; color:var(--text-secondary);">重量</span>
                <input type="number" min="0" step="0.1" value="${item.weight}" data-edit-order-weight="${idx}" style="width:100%; padding:6px 10px; font-size:14px;" />
              </label>
              <span style="font-size:13px; color:var(--text-secondary);">${unit}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  // 绑定拖拽事件（与食谱模块相同）
  let draggedIndex = null;
  
  listEl.querySelectorAll('.recipe-ingredient-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedIndex = parseInt(item.dataset.index, 10);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedIndex);
      item.style.opacity = '0.5';
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', (e) => {
      item.style.opacity = '1';
      item.classList.remove('dragging');
      listEl.querySelectorAll('.recipe-ingredient-item').forEach(el => {
        el.classList.remove('drag-over');
      });
      draggedIndex = null;
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const afterElement = getDragAfterElement(listEl, e.clientY);
      const dragging = listEl.querySelector('.dragging');
      
      if (dragging && afterElement == null) {
        listEl.appendChild(dragging);
      } else if (dragging && afterElement) {
        listEl.insertBefore(dragging, afterElement);
      }
    });
    
    item.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (item.classList.contains('dragging')) return;
      item.classList.add('drag-over');
    });
    
    item.addEventListener('dragleave', (e) => {
      item.classList.remove('drag-over');
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      
      if (draggedIndex === null) return;
      
      const draggingEl = listEl.querySelector('.dragging');
      if (!draggingEl) return;
      
      const allItems = Array.from(listEl.children).filter(el => el.classList.contains('recipe-ingredient-item'));
      const toIndex = allItems.indexOf(draggingEl);
      
      if (draggedIndex !== toIndex && !isNaN(toIndex) && toIndex >= 0 && toIndex < currentOrderRecipeIngredients.length) {
        const [movedItem] = currentOrderRecipeIngredients.splice(draggedIndex, 1);
        currentOrderRecipeIngredients.splice(toIndex, 0, movedItem);
        
        if (editingOrderRecipeIngredientIndex !== null) {
          if (editingOrderRecipeIngredientIndex === draggedIndex) {
            editingOrderRecipeIngredientIndex = toIndex;
          } else if (editingOrderRecipeIngredientIndex > draggedIndex && editingOrderRecipeIngredientIndex <= toIndex) {
            editingOrderRecipeIngredientIndex--;
          } else if (editingOrderRecipeIngredientIndex < draggedIndex && editingOrderRecipeIngredientIndex >= toIndex) {
            editingOrderRecipeIngredientIndex++;
          }
        }
        
        renderOrderRecipeIngredientsList();
        calculateOrderRecipeTotalWeight();
      }
    });
  });
  
  // 绑定编辑按钮
  listEl.querySelectorAll('[data-edit-order-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.editOrderIngredient, 10);
      const item = currentOrderRecipeIngredients[idx];
      if (!item) return;
      
      if (editingOrderRecipeIngredientIndex === idx) {
        // 保存编辑
        const weightInputEl = listEl.querySelector(`[data-edit-order-weight="${idx}"]`);
        const newWeight = parseFloat(weightInputEl ? weightInputEl.value : 0);
        
        if (newWeight <= 0) {
          alert('请输入重量（大于0）');
          return;
        }
        
        item.weight = newWeight;
        editingOrderRecipeIngredientIndex = null;
        selectedOrderRecipeIngredientId = null;
        const searchInput = $('or-ingredient-search');
        if (searchInput) searchInput.value = '';
        const weightInput = $('or-ingredient-weight');
        if (weightInput) weightInput.value = '';
        
        renderOrderRecipeIngredientsList();
        calculateOrderRecipeTotalWeight();
      } else {
        // 开始编辑
        if (editingOrderRecipeIngredientIndex !== null && editingOrderRecipeIngredientIndex !== idx) {
          const prevItem = currentOrderRecipeIngredients[editingOrderRecipeIngredientIndex];
          if (prevItem) {
            const prevWeightInputEl = listEl.querySelector(`[data-edit-order-weight="${editingOrderRecipeIngredientIndex}"]`);
            if (prevWeightInputEl) {
              prevItem.weight = parseFloat(prevWeightInputEl.value) || prevItem.weight;
            }
          }
        }
        
        editingOrderRecipeIngredientIndex = idx;
        selectedOrderRecipeIngredientId = item.ingredientId;
        
        renderOrderRecipeIngredientsList();
        
        const itemEl = listEl.querySelector(`[data-index="${idx}"]`);
        if (itemEl) {
          itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setTimeout(() => {
            const weightInputEl = itemEl.querySelector(`[data-edit-order-weight="${idx}"]`);
            if (weightInputEl) {
              weightInputEl.focus();
              weightInputEl.select();
            }
          }, 100);
        }
      }
    });
  });
  
  // 绑定删除按钮
  listEl.querySelectorAll('[data-remove-order-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removeOrderIngredient, 10);
      
      if (editingOrderRecipeIngredientIndex === idx) {
        editingOrderRecipeIngredientIndex = null;
        selectedOrderRecipeIngredientId = null;
        const searchInput = $('or-ingredient-search');
        const weightInput = $('or-ingredient-weight');
        if (searchInput) searchInput.value = '';
        if (weightInput) weightInput.value = '';
      } else if (editingOrderRecipeIngredientIndex !== null && editingOrderRecipeIngredientIndex > idx) {
        editingOrderRecipeIngredientIndex--;
      }
      
      currentOrderRecipeIngredients.splice(idx, 1);
      renderOrderRecipeIngredientsList();
      calculateOrderRecipeTotalWeight();
    });
  });
  
  // 绑定卡片内重量输入框的回车事件
  listEl.querySelectorAll('[data-edit-order-weight]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const idx = parseInt(input.dataset.editOrderWeight, 10);
        const saveBtn = listEl.querySelector(`[data-edit-order-ingredient="${idx}"]`);
        if (saveBtn) {
          saveBtn.click();
        }
      }
    });
  });
}
// 添加食材到订单中的食谱
function addIngredientToOrderRecipe() {
  const weightInput = $('or-ingredient-weight');
  
  if (!weightInput) return;
  
  const ingredientId = selectedOrderRecipeIngredientId;
  const weight = parseFloat(weightInput.value) || 0;
  
  if (!ingredientId) {
    alert('请先搜索并选择原料');
    return;
  }
  
  if (weight <= 0) {
    alert('请输入重量（大于0）');
    return;
  }
  
  const ing = store.ingredients.find(i => i.id === ingredientId);
  if (!ing) {
    alert('原料不存在');
    return;
  }
  
  // 如果正在编辑某个项，更新该项
  if (editingOrderRecipeIngredientIndex !== null) {
    const item = currentOrderRecipeIngredients[editingOrderRecipeIngredientIndex];
    if (item) {
      item.ingredientId = ingredientId;
      item.weight = weight;
      item.unit = ing.unit || 'g';
      editingOrderRecipeIngredientIndex = null;
      renderOrderRecipeIngredientsList();
      calculateOrderRecipeTotalWeight();
      
      selectedOrderRecipeIngredientId = null;
      const searchInput = $('or-ingredient-search');
      if (searchInput) searchInput.value = '';
      if (weightInput) weightInput.value = '';
      const resultsEl = $('or-ingredient-search-results');
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }
  }
  
  // 检查是否已添加
  const exists = currentOrderRecipeIngredients.find(item => item.ingredientId === ingredientId);
  if (exists) {
    if (confirm('该原料已添加，是否更新重量？')) {
      exists.weight = weight;
      exists.unit = ing.unit || 'g';
    } else {
      return;
    }
  } else {
    currentOrderRecipeIngredients.push({
      ingredientId: ingredientId,
      weight: weight,
      unit: ing.unit || 'g'
    });
  }
  
  renderOrderRecipeIngredientsList();
  calculateOrderRecipeTotalWeight();
  
  // 清空输入
  selectedOrderRecipeIngredientId = null;
  const searchInput = $('or-ingredient-search');
  if (searchInput) searchInput.value = '';
  if (weightInput) weightInput.value = '';
  const resultsEl = $('or-ingredient-search-results');
  if (resultsEl) resultsEl.style.display = 'none';
}

// 计算订单中食谱的总重量
function calculateOrderRecipeTotalWeight() {
  let totalWeight = 0;
  
  currentOrderRecipeIngredients.forEach(item => {
    const ing = store.ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return;
    
    const unit = item.unit || ing.unit || 'g';
    let weightInG = item.weight;
    
    // 转换为g
    if (unit === 'kg') {
      weightInG = item.weight * 1000;
    } else if (unit === 'g' || unit === 'ml') {
      weightInG = item.weight;
    } else if (unit === 'L') {
      weightInG = item.weight * 1000;
    } else {
      if (ing.weightPerUnit) {
        weightInG = item.weight * ing.weightPerUnit;
      } else {
        console.warn('原料缺少每单位重量，无法计算:', ing.name);
        return;
      }
    }
    
    totalWeight += weightInG;
  });
  
  const totalWeightEl = $('or-totalWeight');
  if (totalWeightEl) {
    totalWeightEl.value = totalWeight.toFixed(2);
  }
  
  calculateOrderRecipeKcalDensity();
}

// 计算订单中食谱的热量密度
function calculateOrderRecipeKcalDensity() {
  const totalKcalEl = $('or-totalKcal');
  const totalWeightEl = $('or-totalWeight');
  const kcalDensityEl = $('or-kcalDensity');
  
  if (!totalKcalEl || !totalWeightEl || !kcalDensityEl) return;
  
  const totalKcal = parseFloat(totalKcalEl.value) || 0;
  const totalWeight = parseFloat(totalWeightEl.value) || 0;
  
  if (totalWeight > 0) {
    const density = (totalKcal / totalWeight) * 1000;
    kcalDensityEl.value = density.toFixed(2);
  } else {
    kcalDensityEl.value = '';
  }
}

// 渲染订单中食谱的制作流程列表
function renderOrderRecipeCookingSteps() {
  const stepsEl = $('order-recipe-cooking-steps');
  if (!stepsEl) return;
  
  if (currentOrderRecipeCookingSteps.length === 0) {
    stepsEl.innerHTML = '<div class="muted" style="text-align:center; padding:12px; font-size:13px;">暂无制作流程，点击"添加步骤"添加</div>';
    return;
  }
  
  stepsEl.innerHTML = currentOrderRecipeCookingSteps.map((step, idx) => `
    <div style="display:flex; gap:8px; align-items:start; padding:8px; border:0.5px solid var(--border); border-radius:6px; background:var(--bg-secondary); margin-bottom:6px;">
      <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border-radius:4px; font-weight:600; font-size:13px; color:var(--text-primary); flex-shrink:0; margin-top:2px;">${idx + 1}</div>
      <textarea data-order-step-index="${idx}" style="flex:1; min-height:60px; padding:8px; font-size:13px; border:0.5px solid var(--border); border-radius:4px; resize:vertical;" placeholder="请输入制作步骤...">${step || ''}</textarea>
      <button type="button" class="btn small" data-remove-order-step="${idx}" style="font-size:12px; flex-shrink:0; margin-top:2px;">删除</button>
    </div>
  `).join('');
  
  // 绑定删除按钮
  stepsEl.querySelectorAll('[data-remove-order-step]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.removeOrderStep, 10);
      currentOrderRecipeCookingSteps.splice(idx, 1);
      renderOrderRecipeCookingSteps();
    });
  });
  
  // 绑定textarea输入事件（自动保存）
  stepsEl.querySelectorAll('[data-order-step-index]').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const idx = parseInt(textarea.dataset.orderStepIndex, 10);
      if (idx >= 0 && idx < currentOrderRecipeCookingSteps.length) {
        currentOrderRecipeCookingSteps[idx] = textarea.value;
      }
    });
  });
}

// 添加制作步骤到订单中的食谱
function addCookingStepToOrderRecipe() {
  currentOrderRecipeCookingSteps.push('');
  renderOrderRecipeCookingSteps();
  
  setTimeout(() => {
    const stepsEl = $('order-recipe-cooking-steps');
    if (stepsEl) {
      const lastTextarea = stepsEl.querySelector(`[data-order-step-index="${currentOrderRecipeCookingSteps.length - 1}"]`);
      if (lastTextarea) {
        lastTextarea.focus();
        lastTextarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, 100);
}

// 自动生成订单中食谱的编号
function autoGenerateOrderRecipeCode() {
  const lifeStage = $('or-lifeStage').value || 'adult';
  const nutritionStandard = $('or-nutritionStandard').value || 'FEDIAF';
  const recipeType = $('or-recipeType').value || 'standard';
  
  const code = generateRecipeCode(lifeStage, nutritionStandard, recipeType, null);
  const codeEl = $('or-code');
  if (codeEl) {
    codeEl.value = code;
  }
}

// ========== 鲜食制作类型的功能 ==========

// 填充鲜食制作的食谱下拉框
function populateFoodMakingRecipeSelect() {
  const recipeSelect = $('ofm-recipe-select');
  if (!recipeSelect) return;
  
  recipeSelect.innerHTML = '<option value="">请选择食谱</option>';
  store.recipes.forEach(recipe => {
    const option = document.createElement('option');
    option.value = recipe.id;
    option.textContent = `${recipe.name || '-'} (${recipe.code || '-'})`;
    recipeSelect.appendChild(option);
  });
}
// 自动生成包装清单
// 根据订单信息（每份重量、总重量、总份数）自动选择包装规格和计算用量
function generatePackagingList(servingWeight, totalWeight, totalServings) {
  // 从原料数据库中筛选"包装"类别的条目
  const packagingIngredients = store.ingredients.filter(ing => ing.category === '包装');
  
  if (packagingIngredients.length === 0) {
    console.warn('原料数据库中未找到"包装"类别的条目');
    return [];
  }
  
  // 按项目字段分类
  const packagingByProject = {
    '食品袋': packagingIngredients.filter(ing => ing.name === '食品袋'),
    '泡沫箱': packagingIngredients.filter(ing => ing.name === '泡沫箱'),
    '铝箔保温袋': packagingIngredients.filter(ing => ing.name === '铝箔保温袋'),
    '冰袋': packagingIngredients.filter(ing => ing.name === '冰袋'),
    '标签纸': packagingIngredients.filter(ing => ing.name === '标签纸')
  };
  
  const packagingList = [];
  
  // 1. 食品袋：根据每份重量选择规格，用量=订单的总份数
  if (packagingByProject['食品袋'].length > 0) {
    let selectedFoodBag = null;
    if (servingWeight < 70) {
      // 选择10*15cm
      selectedFoodBag = packagingByProject['食品袋'].find(ing => ing.description && ing.description.includes('10*15cm'));
    } else if (servingWeight >= 70 && servingWeight < 120) {
      // 选择12*17cm
      selectedFoodBag = packagingByProject['食品袋'].find(ing => ing.description && ing.description.includes('12*17cm'));
    } else if (servingWeight >= 120 && servingWeight < 200) {
      // 选择15*20cm
      selectedFoodBag = packagingByProject['食品袋'].find(ing => ing.description && ing.description.includes('15*20cm'));
    } else if (servingWeight >= 200) {
      // 选择20*25cm
      selectedFoodBag = packagingByProject['食品袋'].find(ing => ing.description && ing.description.includes('20*25cm'));
    }
    
    if (selectedFoodBag) {
      const quantity = totalServings;
      const pricePer500 = selectedFoodBag.ediblePricePer500 || selectedFoodBag.pricePer500 || 0;
      const unit = selectedFoodBag.unit || '个';
      // 计算费用：用量 * 每500单位单价 / 500
      const cost = pricePer500 > 0 ? ((quantity * pricePer500) / 500).toFixed(2) : '0.00';
      
      const name = `食品袋${selectedFoodBag.description ? '-' + selectedFoodBag.description : ''}${selectedFoodBag.brand ? '（' + selectedFoodBag.brand + '）' : ''}`;
      
      // 计算单价：每500单位的单价/500
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      // 计算总重量：用量*每单位重量
      const weightPerUnit = selectedFoodBag.weightPerUnit || 0;
      const totalWeight = quantity * weightPerUnit;
      
      packagingList.push({
        ingredientId: selectedFoodBag.id,
        name: name,
        quantity: quantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  // 2. 泡沫箱：根据总重量选择规格，用量根据规格计算
  let selectedFoamBox = null;
  let foamBoxQuantity = 1;
  
  if (packagingByProject['泡沫箱'].length > 0) {
    if (totalWeight < 2500) {
      // 选择4号箱，用量默认为1
      selectedFoamBox = packagingByProject['泡沫箱'].find(ing => ing.description && ing.description.includes('4号箱'));
      foamBoxQuantity = 1;
    } else {
      // 选择3号箱，用量=订单的总重量（净重）/5000克，向上取整
      selectedFoamBox = packagingByProject['泡沫箱'].find(ing => ing.description && ing.description.includes('3号箱'));
      foamBoxQuantity = Math.ceil(totalWeight / 5000);
    }
    
    if (selectedFoamBox) {
      const pricePer500 = selectedFoamBox.ediblePricePer500 || selectedFoamBox.pricePer500 || 0;
      const unit = selectedFoamBox.unit || '个';
      // 计算费用：用量 * 每500单位单价 / 500
      const cost = pricePer500 > 0 ? ((foamBoxQuantity * pricePer500) / 500).toFixed(2) : '0.00';
      
      const name = `泡沫箱${selectedFoamBox.description ? '-' + selectedFoamBox.description : ''}${selectedFoamBox.brand ? '（' + selectedFoamBox.brand + '）' : ''}`;
      
      // 计算单价：每500单位的单价/500
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      // 计算总重量：用量*每单位重量
      const weightPerUnit = selectedFoamBox.weightPerUnit || 0;
      const totalWeight = foamBoxQuantity * weightPerUnit;
      
      packagingList.push({
        ingredientId: selectedFoamBox.id,
        name: name,
        quantity: foamBoxQuantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  // 3. 铝箔保温袋：根据泡沫箱规格选择，用量=泡沫箱用量
  if (packagingByProject['铝箔保温袋'].length > 0 && selectedFoamBox) {
    let selectedInsulationBag = null;
    if (selectedFoamBox.description && selectedFoamBox.description.includes('3号箱')) {
      // 选择适配3号箱
      selectedInsulationBag = packagingByProject['铝箔保温袋'].find(ing => ing.description && ing.description.includes('3号箱'));
    } else if (selectedFoamBox.description && selectedFoamBox.description.includes('4号箱')) {
      // 选择适配4号箱
      selectedInsulationBag = packagingByProject['铝箔保温袋'].find(ing => ing.description && ing.description.includes('4号箱'));
    }
    
    if (selectedInsulationBag) {
      const quantity = foamBoxQuantity; // 用量等于泡沫箱用量
      const pricePer500 = selectedInsulationBag.ediblePricePer500 || selectedInsulationBag.pricePer500 || 0;
      const unit = selectedInsulationBag.unit || '个';
      // 计算费用：用量 * 每500单位单价 / 500
      const cost = pricePer500 > 0 ? ((quantity * pricePer500) / 500).toFixed(2) : '0.00';
      
      const name = `铝箔保温袋${selectedInsulationBag.description ? '-' + selectedInsulationBag.description : ''}${selectedInsulationBag.brand ? '（' + selectedInsulationBag.brand + '）' : ''}`;
      
      // 计算单价：每500单位的单价/500
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      // 计算总重量：用量*每单位重量
      const weightPerUnit = selectedInsulationBag.weightPerUnit || 0;
      const totalWeight = quantity * weightPerUnit;
      
      packagingList.push({
        ingredientId: selectedInsulationBag.id,
        name: name,
        quantity: quantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  // 4. 冰袋：默认选择200ml，用量根据泡沫箱规格
  if (packagingByProject['冰袋'].length > 0 && selectedFoamBox) {
    const selectedIceBag = packagingByProject['冰袋'].find(ing => ing.description && ing.description.includes('200ml'));
    if (selectedIceBag) {
      const perBoxQuantity = (selectedFoamBox.description && selectedFoamBox.description.includes('3号箱')) ? 5 : 3;
      const quantity = perBoxQuantity * foamBoxQuantity;
      const pricePer500 = selectedIceBag.ediblePricePer500 || selectedIceBag.pricePer500 || 0;
      const unit = selectedIceBag.unit || '个';
      const cost = pricePer500 > 0 ? ((quantity * pricePer500) / 500).toFixed(2) : '0.00';
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      const weightPerUnit = selectedIceBag.weightPerUnit || 0;
      const totalWeight = quantity * weightPerUnit;
      const name = `冰袋${selectedIceBag.description ? '-' + selectedIceBag.description : ''}${selectedIceBag.brand ? '（' + selectedIceBag.brand + '）' : ''}`;
      packagingList.push({
        ingredientId: selectedIceBag.id,
        name: name,
        quantity: quantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  // 5. 标签纸：默认选择70*100mm，用量=订单的总份数
  if (packagingByProject['标签纸'].length > 0) {
    // 默认选择70*100mm
    const selectedLabel = packagingByProject['标签纸'].find(ing => ing.description && ing.description.includes('70*100mm'));
    
    if (selectedLabel) {
      const quantity = totalServings; // 用量=订单的总份数
      const pricePer500 = selectedLabel.ediblePricePer500 || selectedLabel.pricePer500 || 0;
      const unit = selectedLabel.unit || '张';
      // 计算费用：用量 * 每500单位单价 / 500
      const cost = pricePer500 > 0 ? ((quantity * pricePer500) / 500).toFixed(2) : '0.00';
      
      const name = `标签纸${selectedLabel.description ? '-' + selectedLabel.description : ''}${selectedLabel.brand ? '（' + selectedLabel.brand + '）' : ''}`;
      
      // 计算单价：每500单位的单价/500
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      // 计算总重量：用量*每单位重量
      const weightPerUnit = selectedLabel.weightPerUnit || 0;
      const totalWeight = quantity * weightPerUnit;
      
      packagingList.push({
        ingredientId: selectedLabel.id,
        name: name,
        quantity: quantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  return packagingList;
}
// 计算并展示鲜食制作的食材总用量
function calculateFoodMakingIngredients() {
  const customerId = $('o-customerId') ? $('o-customerId').value : '';
  const recipeId = $('ofm-recipe-select') ? $('ofm-recipe-select').value : '';
  const days = parseInt(($('ofm-days') ? $('ofm-days').value : '') || '1') || 1;
  
  console.log('calculateFoodMakingIngredients called:', { customerId, recipeId, days });
  
  if (!customerId || !recipeId) {
    console.log('Missing customerId or recipeId, hiding sections');
    if ($('ofm-recipe-info')) $('ofm-recipe-info').style.display = 'none';
    if ($('ofm-ingredients-summary')) $('ofm-ingredients-summary').style.display = 'none';
    return;
  }
  
  const customer = store.customers.find(c => c.id === customerId);
  const recipe = store.recipes.find(r => r.id === recipeId);
  
  if (!customer || !recipe) {
    console.log('Customer or recipe not found, hiding sections');
    if ($('ofm-recipe-info')) $('ofm-recipe-info').style.display = 'none';
    if ($('ofm-ingredients-summary')) $('ofm-ingredients-summary').style.display = 'none';
    return;
  }
  
  console.log('Customer and recipe found, proceeding with calculation');
  
  // 计算每份的重量比例
  const estKcal = customer.estKcal || 0;
  const recipeTotalKcal = recipe.totalKcal || 0;
  
  // 计算比例，如果能量数据缺失则设为0
  const ratio = (estKcal > 0 && recipeTotalKcal > 0) ? (estKcal / recipeTotalKcal) : 0;
  
  if (estKcal <= 0 || recipeTotalKcal <= 0) {
    // 即使能量数据缺失，也显示表格结构（但可能数据为空）
    console.warn('顾客每日能量估算或食谱总热量缺失，但继续显示表格');
  }
  
  // 计算总份数和每份重量
  const mealsPerDay = customer.mealsPerDay || 1;
  const totalServings = mealsPerDay * days;
  
  // 计算每份重量：每份重量 = 食谱总重量 × (顾客每日能量估算 / 食谱总热量) / 每天吃几顿
  // 如果 ratio 为 0，则 servingWeight 也为 0
  const servingWeight = ratio > 0 ? ((recipe.totalWeight || 0) * ratio / mealsPerDay) : 0;
  
  // 计算总重量和总热量
  const totalWeight = servingWeight * totalServings;
  const totalKcal = (recipe.totalKcal && ratio > 0) ? (recipe.totalKcal * ratio * days) : 0;
  
  // 自动生成包装清单（如果当前包装清单为空、是新增订单，或者食谱信息发生变化，则自动生成）
  const orderId = $('order-id') ? $('order-id').value : null;
  const currentRecipeId = recipeId;
  const currentDays = days;
  const currentCustomerId = customerId;
  
  // 检查食谱信息是否发生变化（通过比较当前值和保存的值）
  const recipeInfoChanged = !orderId || 
    currentFoodMakingRecipeId !== currentRecipeId || 
    currentFoodMakingDays !== currentDays ||
    (orderId && currentFoodMakingPackaging.length === 0);
  
  if (recipeInfoChanged || currentFoodMakingPackaging.length === 0) {
    // 新增订单、包装清单为空或食谱信息变化时，自动生成
    currentFoodMakingPackaging = generatePackagingList(servingWeight, totalWeight, totalServings);
  } else {
    // 编辑订单时，如果包装清单已存在且食谱信息未变化，则保留用户的手动修改
    // 但需要更新费用、单价和总重量（如果原料价格有变化）
    currentFoodMakingPackaging = currentFoodMakingPackaging.map(item => {
      const ingredient = store.ingredients.find(ing => ing.id === item.ingredientId);
      if (ingredient) {
        const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
        const quantity = parseFloat(item.quantity) || 0;
        // 重新计算单价：每500单位的单价/500
        const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
        // 重新计算费用
        const cost = pricePer500 > 0 ? parseFloat(((quantity * pricePer500) / 500).toFixed(2)) : 0;
        // 重新计算总重量：用量*每单位重量
        const weightPerUnit = ingredient.weightPerUnit || 0;
        const totalWeight = quantity * weightPerUnit;
        return {
          ...item,
          unitPrice: unitPrice,
          totalWeight: totalWeight,
          cost: cost
        };
      }
      return item;
    });
  }
  
  // 显示食谱信息（按顺序：食谱名称、制作天数、每份总量、总份数、总重量（净重）、总热量）
  const recipeInfoEl = $('ofm-recipe-info-content');
  if (recipeInfoEl) {
    recipeInfoEl.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; font-size:13px;">
        <div><strong>食谱名称：</strong>${recipe.name || '-'}</div>
        <div><strong>制作天数：</strong>${days} 天</div>
        <div><strong>每份总量：</strong>${servingWeight.toFixed(2)} g</div>
        <div><strong>总份数：</strong>${totalServings} 份</div>
        <div><strong>总重量（净重）：</strong>${totalWeight.toFixed(2)} g</div>
        <div><strong>总热量：</strong>${totalKcal.toFixed(2)} kcal</div>
      </div>
    `;
    $('ofm-recipe-info').style.display = 'block';
  }
  // 计算并显示食材总用量
  const ingredientsSummaryEl = $('ofm-ingredients-summary-content');
  console.log('ingredientsSummaryEl found:', !!ingredientsSummaryEl);
  
  if (ingredientsSummaryEl) {
    console.log('Rendering ingredients table, recipe.ingredients:', recipe.ingredients ? recipe.ingredients.length : 0);
    // 先计算总用量和总重量（只计算单位是"g"的食材）
    let totalWeightForPercent = 0;
    const ingredientsData = (recipe.ingredients || []).map((ingItem, idx) => {
      const ingredient = store.ingredients.find(i => i.id === ingItem.ingredientId);
      if (!ingredient) return null;
      
      const unit = ingItem.unit || ingredient.unit || 'g';
      // 单份用量 = 食谱中该食材重量 × (顾客每日能量估算 / 食谱总热量) / 每天吃几顿
      // 如果 ratio 为 0，则用量为 0
      const singleServingsAmount = ratio > 0 ? (ingItem.weight * ratio / mealsPerDay) : 0;
      const totalAmount = singleServingsAmount * totalServings; // 总用量
      
      // 计算该食材在总重量中的占比（只计算单位是"g"的）
      let weightInG = 0;
      if (unit === 'g' || unit === 'ml') {
        weightInG = totalAmount;
      } else if (unit === 'kg') {
        weightInG = totalAmount * 1000;
      } else if (unit === 'L') {
        weightInG = totalAmount * 1000;
      } else if (unit !== 'g' && unit !== 'ml') {
        // 其他单位需要每单位重量
        if (ingredient.weightPerUnit) {
          weightInG = totalAmount * ingredient.weightPerUnit;
        }
      }
      
      if (unit === 'g' || unit === 'ml' || unit === 'kg' || unit === 'L' || (unit !== 'g' && unit !== 'ml' && ingredient.weightPerUnit)) {
        totalWeightForPercent += weightInG;
      }
      
      const name = ingredient.name || '';
      const description = ingredient.description || '';
      const brand = ingredient.brand || '';
      let displayText = name;
      if (description) {
        displayText += '-' + description;
      }
      if (brand) {
        displayText += '（' + brand + '）';
      }
      
      return {
        idx,
        ingredientId: ingItem.ingredientId,
        displayText,
        totalAmount,
        unit,
        weightInG
      };
    }).filter(x => x !== null);
    
    let html = `
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:var(--bg-tertiary);">
            <th style="padding:8px; border:0.5px solid var(--border); text-align:left;">序号</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:left;">食材名称</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">总用量</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:left;">单位</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">重量占比</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">费用（含制作损耗）</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    if (ingredientsData.length > 0) {
      ingredientsData.forEach((item) => {
        // 计算重量占比（只对可以转换为重量的食材计算）
        let weightPercent = '-';
        if (item.weightInG > 0 && totalWeightForPercent > 0) {
          weightPercent = ((item.weightInG / totalWeightForPercent) * 100).toFixed(2) + '%';
        }
        
        // 计算费用（含制作损耗）：总用量 * (1 + 食谱制作损耗) * 每500单位单价 / 500
        // 直接使用总用量和单价计算，不需要转换为克
        const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
        let estimatedCost = '-';
        if (ingredient) {
          const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
          if (pricePer500 > 0 && item.totalAmount > 0) {
            // 获取食谱的制作损耗（百分比），默认为7%
            const cookingLoss = recipe.cookingLoss || 7;
            // 计算：总用量 * (1 + 制作损耗/100) * 每500单位单价 / 500
            const totalAmountWithLoss = item.totalAmount * (1 + cookingLoss / 100);
            estimatedCost = ((totalAmountWithLoss * pricePer500) / 500).toFixed(2);
          }
        }
        
        html += `
          <tr>
            <td style="padding:6px; border:0.5px solid var(--border);">${item.idx + 1}</td>
            <td style="padding:6px; border:0.5px solid var(--border);">${item.displayText}</td>
            <td style="padding:6px; border:0.5px solid var(--border); text-align:right; font-weight:500;">${item.totalAmount.toFixed(2)}</td>
            <td style="padding:6px; border:0.5px solid var(--border);">${item.unit}</td>
            <td style="padding:6px; border:0.5px solid var(--border); text-align:right;">${weightPercent}</td>
            <td style="padding:6px; border:0.5px solid var(--border); text-align:right; font-weight:500;">${estimatedCost === '-' ? '-' : '¥' + estimatedCost}</td>
          </tr>
        `;
      });
    } else {
      html += `
        <tr>
          <td colspan="6" style="padding:12px; border:0.5px solid var(--border); text-align:center; color:var(--text-secondary);">该食谱暂无食材</td>
        </tr>
      `;
    }
    
    // 计算日期默认值（新增订单时，或编辑订单但没有保存的日期时）
    const orderId = $('order-id') ? $('order-id').value : null;
    let productionDateValue = '';
    let shippingDateValue = '';
    
    // 如果是新增订单，或者编辑订单但需要计算默认日期，则计算
    if (!orderId) {
      // 新增订单：计算默认日期
      let orderDate = $('o-orderDate') ? $('o-orderDate').value : '';
      if (!orderDate) {
        orderDate = new Date().toISOString().split('T')[0];
      }
      
      console.log('计算日期默认值 - 订单创建日期:', orderDate);
      
      if (orderDate) {
        // 计算制作日期（订单创建日期的第二天）
        // 使用本地时区避免时区问题
        const [year, month, day] = orderDate.split('-').map(Number);
        const orderDateObj = new Date(year, month - 1, day);
        orderDateObj.setDate(orderDateObj.getDate() + 1);
        productionDateValue = `${orderDateObj.getFullYear()}-${String(orderDateObj.getMonth() + 1).padStart(2, '0')}-${String(orderDateObj.getDate()).padStart(2, '0')}`;
        console.log('计算制作日期 - 加1天后:', productionDateValue);
        
        // 计算发货日期（制作日期的第二天）
        const [pYear, pMonth, pDay] = productionDateValue.split('-').map(Number);
        const productionDateObj = new Date(pYear, pMonth - 1, pDay);
        productionDateObj.setDate(productionDateObj.getDate() + 1);
        shippingDateValue = `${productionDateObj.getFullYear()}-${String(productionDateObj.getMonth() + 1).padStart(2, '0')}-${String(productionDateObj.getDate()).padStart(2, '0')}`;
        console.log('计算发货日期 - 加1天后:', shippingDateValue);
        
        console.log('计算日期默认值 - 制作日期:', productionDateValue, '发货日期:', shippingDateValue);
      }
    } else {
      console.log('编辑订单，日期值将在openOrderForm中单独处理');
    }
    
    // 计算食材总费用（所有食材的费用求和）
    let totalIngredientCost = 0;
    ingredientsData.forEach((item) => {
      const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
      if (ingredient) {
        const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
        if (pricePer500 > 0 && item.totalAmount > 0) {
          const cookingLoss = recipe.cookingLoss || 7;
          const totalAmountWithLoss = item.totalAmount * (1 + cookingLoss / 100);
          const cost = parseFloat(((totalAmountWithLoss * pricePer500) / 500).toFixed(2));
          totalIngredientCost += cost;
        }
      }
    });
    
    // 计算预估人工成本：向上取整（总重量（净重）/4000）*20
    const laborCost = Math.ceil(totalWeight / 4000) * 20;
    
    // 计算包装总费用和包装总重量
    const packagingTotalCost = currentFoodMakingPackaging.reduce((sum, item) => {
      return sum + (parseFloat(item.cost) || 0);
    }, 0);
    const packagingTotalWeight = currentFoodMakingPackaging.reduce((sum, item) => {
      return sum + (parseFloat(item.totalWeight) || 0);
    }, 0);
    
    // 计算预估快递费用（根据快递类型）
    // 包裹总重=总重量（净重）*（1+制作损耗）+包装总重量
    const cookingLoss = recipe.cookingLoss || 7;
    const packageTotalWeight = totalWeight * (1 + cookingLoss / 100) + packagingTotalWeight;
    const previousPriceEditArea = document.getElementById('ofm-price-edit-area');
    const wasEditingPrice = previousPriceEditArea ? previousPriceEditArea.dataset.editing === 'true' : false;
    const previousManualPriceInput = document.getElementById('ofm-manual-price');
    const previousManualInputValue = previousManualPriceInput ? previousManualPriceInput.value : '';
    let shippingType = currentFoodMakingShippingType || 'remote';
    const existingShippingSelect = document.getElementById('ofm-shipping-type');
    if (existingShippingSelect && existingShippingSelect.value) {
      shippingType = existingShippingSelect.value;
    }
    let shippingCost = 0;
    let shippingDescText = '';
    if (shippingType === 'local') {
      shippingCost = 20;
      shippingDescText = '（同城快递固定 ¥20）';
    } else if (shippingType === 'none') {
      shippingCost = 0;
      shippingDescText = '（无需快递，费用为 0）';
    } else {
      shippingType = 'remote';
      shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
      shippingDescText = `（自动计算：23 + (包裹总重${(packageTotalWeight / 1000).toFixed(2)}kg - 1) × 13 + 5）`;
    }
    currentFoodMakingShippingType = shippingType;
    
    // 计算订单总价：订单总价=（食材总费用+包装总费用+预估人工成本+预估快递费用）*2
    const subtotalCost = totalIngredientCost + packagingTotalCost + laborCost + shippingCost;
    const orderTotalPriceAuto = Math.round(subtotalCost * 2);
    latestFoodMakingAutoPrice = orderTotalPriceAuto;
    const displayOrderTotalPrice = manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : orderTotalPriceAuto;
    const displayOrderTotalPriceRounded = Math.round(displayOrderTotalPrice || 0);
    if (manualFoodMakingOrderPrice != null) {
      manualFoodMakingOrderPrice = displayOrderTotalPriceRounded;
    }
    const orderPriceDescText = manualFoodMakingOrderPrice != null ? '（已手动改价）' : '（自动计算并取整数）';
    
    html += `
        </tbody>
      </table>
      <div style="margin-top:16px; padding:12px; background:var(--bg-tertiary); border-radius:6px;">
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; font-size:13px;">
          <div>
            <strong>订单制作日期：</strong>
            <input id="ofm-production-date" type="date" value="${productionDateValue}" style="margin-left:8px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px;" />
          </div>
          <div>
            <strong>订单发货日期：</strong>
            <input id="ofm-shipping-date" type="date" value="${shippingDateValue}" style="margin-left:8px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px;" />
          </div>
        </div>
      </div>
      <div style="margin-top:16px; padding:16px; background:var(--bg-secondary); border-radius:8px; border:1px solid var(--border);">
        <h3 style="margin:0 0 16px 0; font-size:16px; font-weight:600;">费用计算</h3>
        <div style="display:grid; grid-template-columns: 1fr; gap:12px; font-size:13px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <strong style="min-width:120px;">食材总费用：</strong>
            <span id="ofm-total-ingredient-cost" style="font-weight:600; color:var(--text-primary);">¥${totalIngredientCost.toFixed(2)}</span>
            <span style="color:var(--text-secondary); font-size:12px;">（自动计算，不可更改）</span>
          </div>
          <div style="margin-top:8px;">
            <strong style="display:block; margin-bottom:8px;">包装清单：</strong>
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">（自动生成，可手动修改）</div>
            <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:8px;">
              <thead>
                <tr style="background:var(--bg-tertiary);">
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:left;">包装项目</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">用量</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">单价</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">总费用</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">总重量(g)</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:center;">操作</th>
                </tr>
              </thead>
              <tbody id="ofm-packaging-list">
                ${currentFoodMakingPackaging.map((item, idx) => `
                  <tr>
                    <td style="padding:6px; border:0.5px solid var(--border);">${item.name || ''}</td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:right;">
                      <input type="number" data-packaging-quantity="${idx}" value="${item.quantity || ''}" placeholder="用量" min="0" step="0.01" style="width:80px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px; text-align:right;" />
                      <span style="margin-left:4px; font-size:12px; color:var(--text-secondary);">${item.unit || ''}</span>
                    </td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:right; font-weight:500;" data-packaging-unit-price="${idx}">¥${(item.unitPrice || 0).toFixed(4)}</td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:right;">
                      <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                        <span style="font-size:13px; color:var(--text-primary);">¥</span>
                        <input type="number" data-packaging-cost="${idx}" value="${(item.cost || 0).toFixed(2)}" placeholder="费用" min="0" step="0.01" style="width:100px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px; text-align:right;" />
                      </div>
                    </td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:right; font-weight:500;" data-packaging-total-weight="${idx}">${(item.totalWeight || 0).toFixed(2)}</td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:center;">
                      <button type="button" class="btn small" data-packaging-remove="${idx}" style="padding:4px 12px; font-size:12px;">删除</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:var(--bg-secondary); font-weight:600;">
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:left;">合计</td>
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:right;">-</td>
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:right;">-</td>
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:right;" id="ofm-packaging-total-cost">¥${packagingTotalCost.toFixed(2)}</td>
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:right;" id="ofm-packaging-total-weight">${currentFoodMakingPackaging.reduce((sum, item) => sum + (parseFloat(item.totalWeight) || 0), 0).toFixed(2)}</td>
                  <td style="padding:8px; border:0.5px solid var(--border);"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <strong style="min-width:120px;">快递类型：</strong>
            <select id="ofm-shipping-type" style="padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px;">
              <option value="remote" ${shippingType === 'remote' ? 'selected' : ''}>异地快递</option>
              <option value="local" ${shippingType === 'local' ? 'selected' : ''}>同城快递</option>
              <option value="none" ${shippingType === 'none' ? 'selected' : ''}>无需快递</option>
            </select>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <strong style="min-width:120px;">预估快递费用：</strong>
            <span id="ofm-shipping-cost" style="font-weight:600; color:var(--text-primary);">¥${shippingCost.toFixed(2)}</span>
            <span id="ofm-shipping-cost-desc" style="color:var(--text-secondary); font-size:12px;">${shippingDescText}</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <strong style="min-width:120px;">预估人工成本：</strong>
            <span id="ofm-labor-cost" style="font-weight:600; color:var(--text-primary);">¥${laborCost.toFixed(2)}</span>
            <span style="color:var(--text-secondary); font-size:12px;">（自动计算：向上取整（总重量${totalWeight.toFixed(2)}g÷4000）×20）</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <strong style="min-width:120px;">订单总价：</strong>
            <span id="ofm-order-total-price" style="font-weight:700; font-size:18px; color:var(--accent);">¥${displayOrderTotalPriceRounded}</span>
            <span id="ofm-order-total-price-desc" style="color:var(--text-secondary); font-size:12px;">${orderPriceDescText}</span>
            <button type="button" id="ofm-price-edit" class="btn small" style="padding:4px 12px; font-size:12px; display:${manualFoodMakingOrderPrice != null ? 'none' : 'inline-flex'};">改价</button>
            <div id="ofm-price-edit-area" style="display:${manualFoodMakingOrderPrice != null ? 'flex' : 'none'}; gap:8px; align-items:center;">
              <input id="ofm-manual-price" type="number" min="0" step="1" value="${manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : displayOrderTotalPriceRounded}" style="width:120px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px;" />
              <button type="button" id="ofm-price-confirm" class="btn small" style="padding:4px 12px; font-size:12px;">确认</button>
              <button type="button" id="ofm-price-reset" class="btn small" style="padding:4px 12px; font-size:12px;">恢复默认价格</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    console.log('生成HTML时的日期值:', { productionDateValue, shippingDateValue });
    ingredientsSummaryEl.innerHTML = html;
    const priceEditArea = document.getElementById('ofm-price-edit-area');
    if (priceEditArea) {
      const editingState = manualFoodMakingOrderPrice != null ? 'true' : (wasEditingPrice ? 'true' : 'false');
      priceEditArea.dataset.editing = editingState;
      if (editingState === 'true') {
        priceEditArea.style.display = 'flex';
      }
    }
    const manualPriceInput = document.getElementById('ofm-manual-price');
    if (manualPriceInput) {
      if (manualFoodMakingOrderPrice != null) {
        manualPriceInput.value = manualFoodMakingOrderPrice;
      } else if (wasEditingPrice && previousManualInputValue !== '') {
        manualPriceInput.value = previousManualInputValue;
      } else {
        manualPriceInput.value = displayOrderTotalPriceRounded;
      }
    }
    const priceEditBtn = document.getElementById('ofm-price-edit');
    if (priceEditBtn) {
      if (priceEditArea && priceEditArea.dataset.editing === 'true') {
        priceEditBtn.style.display = 'none';
      } else if (manualFoodMakingOrderPrice == null) {
        priceEditBtn.style.display = 'inline-flex';
      }
    }
    const shippingTypeSelect = document.getElementById('ofm-shipping-type');
    if (shippingTypeSelect) {
      shippingTypeSelect.value = currentFoodMakingShippingType || 'remote';
    }
    
    // 立即验证日期值是否被正确设置
    setTimeout(() => {
      const productionDateInput = document.getElementById('ofm-production-date');
      const shippingDateInput = document.getElementById('ofm-shipping-date');
      if (productionDateInput && shippingDateInput) {
        console.log('HTML生成后立即检查日期值:', {
          productionDateInputValue: productionDateInput.value,
          shippingDateInputValue: shippingDateInput.value,
          expectedProductionDate: productionDateValue,
          expectedShippingDate: shippingDateValue
        });
      }
    }, 10);
    const summaryContainer = $('ofm-ingredients-summary');
    if (summaryContainer) {
      summaryContainer.style.display = 'block';
      console.log('Ingredients summary container displayed');
    } else {
      console.error('ofm-ingredients-summary element not found!');
    }
    // 设置日期默认值或加载保存的日期
    setTimeout(() => {
      const productionDateInput = document.getElementById('ofm-production-date');
      const shippingDateInput = document.getElementById('ofm-shipping-date');
      
      if (productionDateInput && shippingDateInput) {
        const orderId = $('order-id') ? $('order-id').value : null;
        
        // 注意：编辑订单时，日期会在openOrderForm中单独处理
        // 这里只处理新增订单的情况
        if (!orderId) {
          // 新增订单：设置默认值
          // 获取订单日期，如果没有则使用当前日期
          let orderDate = $('o-orderDate') ? $('o-orderDate').value : '';
          if (!orderDate) {
            orderDate = new Date().toISOString().split('T')[0];
            // 如果订单日期字段存在，也更新它
            if ($('o-orderDate')) {
              $('o-orderDate').value = orderDate;
            }
          }
          
          // 强制设置日期默认值（新增订单时总是设置）
          if (orderDate) {
            // 计算制作日期（订单创建日期的第二天）
            // 使用本地时区避免时区问题
            const [year, month, day] = orderDate.split('-').map(Number);
            const orderDateObj = new Date(year, month - 1, day);
            orderDateObj.setDate(orderDateObj.getDate() + 1);
            const productionDate = `${orderDateObj.getFullYear()}-${String(orderDateObj.getMonth() + 1).padStart(2, '0')}-${String(orderDateObj.getDate()).padStart(2, '0')}`;
            
            // 计算发货日期（制作日期的第二天）
            const [pYear, pMonth, pDay] = productionDate.split('-').map(Number);
            const productionDateObj = new Date(pYear, pMonth - 1, pDay);
            productionDateObj.setDate(productionDateObj.getDate() + 1);
            const shippingDate = `${productionDateObj.getFullYear()}-${String(productionDateObj.getMonth() + 1).padStart(2, '0')}-${String(productionDateObj.getDate()).padStart(2, '0')}`;
            
            // 强制设置日期值（新增订单时总是设置默认值）
            productionDateInput.value = productionDate;
            shippingDateInput.value = shippingDate;
            
            // 再次验证日期值是否被正确设置
            console.log('setTimeout中设置日期默认值:', { 
              orderDate, 
              productionDate, 
              shippingDate,
              productionDateInputValue: productionDateInput.value,
              shippingDateInputValue: shippingDateInput.value,
              productionDateInputValueAfterSet: productionDateInput.value === productionDate ? '✓ 正确' : '✗ 错误',
              shippingDateInputValueAfterSet: shippingDateInput.value === shippingDate ? '✓ 正确' : '✗ 错误'
            });
            
            // 如果日期值不正确，强制再次设置
            if (productionDateInput.value !== productionDate) {
              console.warn('制作日期值不正确，强制重新设置');
              productionDateInput.setAttribute('value', productionDate);
              productionDateInput.value = productionDate;
            }
            if (shippingDateInput.value !== shippingDate) {
              console.warn('发货日期值不正确，强制重新设置');
              shippingDateInput.setAttribute('value', shippingDate);
              shippingDateInput.value = shippingDate;
            }
          }
        }
      } else {
        console.warn('日期输入框未找到，重试...');
        // 如果元素还没创建，再等一会儿
        setTimeout(() => {
          const productionDateInput = document.getElementById('ofm-production-date');
          const shippingDateInput = document.getElementById('ofm-shipping-date');
          if (productionDateInput && shippingDateInput) {
            const orderId = $('order-id') ? $('order-id').value : null;
            if (!orderId) {
              let orderDate = $('o-orderDate') ? $('o-orderDate').value : '';
              if (!orderDate) {
                orderDate = new Date().toISOString().split('T')[0];
              }
              if (orderDate) {
                // 计算制作日期（订单创建日期的第二天）
                // 使用本地时区避免时区问题
                const [year, month, day] = orderDate.split('-').map(Number);
                const orderDateObj = new Date(year, month - 1, day);
                orderDateObj.setDate(orderDateObj.getDate() + 1);
                const productionDate = `${orderDateObj.getFullYear()}-${String(orderDateObj.getMonth() + 1).padStart(2, '0')}-${String(orderDateObj.getDate()).padStart(2, '0')}`;
                
                // 计算发货日期（制作日期的第二天）
                const [pYear, pMonth, pDay] = productionDate.split('-').map(Number);
                const productionDateObj = new Date(pYear, pMonth - 1, pDay);
                productionDateObj.setDate(productionDateObj.getDate() + 1);
                const shippingDate = `${productionDateObj.getFullYear()}-${String(productionDateObj.getMonth() + 1).padStart(2, '0')}-${String(productionDateObj.getDate()).padStart(2, '0')}`;
                
                // 强制设置日期值
                productionDateInput.value = productionDate;
                shippingDateInput.value = shippingDate;
              }
            }
          }
        }, 200);
      }
    }, 100);
    
    // 保存计算结果到全局变量
    currentFoodMakingRecipeId = recipeId;
    currentFoodMakingDays = days;
    
    // 绑定费用计算板块的事件监听器
    setupFoodMakingCostCalculation();
  } else {
    $('ofm-ingredients-summary').style.display = 'none';
  }
}

// 更新包装清单合计
function updatePackagingTotals() {
  const packagingTotalCost = currentFoodMakingPackaging.reduce((sum, item) => {
    return sum + (parseFloat(item.cost) || 0);
  }, 0);
  const packagingTotalWeight = currentFoodMakingPackaging.reduce((sum, item) => {
    return sum + (parseFloat(item.totalWeight) || 0);
  }, 0);
  
  const totalCostEl = document.getElementById('ofm-packaging-total-cost');
  const totalWeightEl = document.getElementById('ofm-packaging-total-weight');
  
  if (totalCostEl) {
    totalCostEl.textContent = `¥${packagingTotalCost.toFixed(2)}`;
  }
  if (totalWeightEl) {
    totalWeightEl.textContent = packagingTotalWeight.toFixed(2);
  }
}
// 设置鲜食制作费用计算板块的事件监听器
function setupFoodMakingCostCalculation() {
  // 删除包装按钮（使用事件委托）
  const packagingList = document.getElementById('ofm-packaging-list');
  if (packagingList) {
    packagingList.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-packaging-remove')) {
        const idx = parseInt(e.target.getAttribute('data-packaging-remove'));
        const item = currentFoodMakingPackaging[idx];
        if (item && confirm(`确定要删除"${item.name || '该包装项'}"吗？`)) {
          currentFoodMakingPackaging.splice(idx, 1);
          calculateFoodMakingIngredients(); // 重新渲染（会重新计算合计）
        }
      }
    });
    
    // 包装清单输入框变化时更新数据并重新计算总价
    packagingList.addEventListener('input', (e) => {
      if (e.target.hasAttribute('data-packaging-quantity')) {
        const idx = parseInt(e.target.getAttribute('data-packaging-quantity'));
        if (currentFoodMakingPackaging[idx]) {
          const quantity = parseFloat(e.target.value) || 0;
          currentFoodMakingPackaging[idx].quantity = quantity;
          
          // 重新计算费用、单价和总重量
          const ingredient = store.ingredients.find(ing => ing.id === currentFoodMakingPackaging[idx].ingredientId);
          if (ingredient) {
            const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
            // 重新计算单价：每500单位的单价/500
            const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
            // 重新计算费用：用量 * 每500单位单价 / 500
            const cost = pricePer500 > 0 ? parseFloat(((quantity * pricePer500) / 500).toFixed(2)) : 0;
            // 重新计算总重量：用量*每单位重量
            const weightPerUnit = ingredient.weightPerUnit || 0;
            const totalWeight = quantity * weightPerUnit;
            
            currentFoodMakingPackaging[idx].unitPrice = unitPrice;
            currentFoodMakingPackaging[idx].cost = cost;
            currentFoodMakingPackaging[idx].totalWeight = totalWeight;
            
            // 更新单价显示
            const unitPriceEl = packagingList.querySelector(`[data-packaging-unit-price="${idx}"]`);
            if (unitPriceEl) {
              unitPriceEl.textContent = `¥${unitPrice.toFixed(4)}`;
            }
            
            // 更新费用显示（费用输入框在¥符号后面）
            const costInput = packagingList.querySelector(`[data-packaging-cost="${idx}"]`);
            if (costInput) {
              costInput.value = cost.toFixed(2);
            }
            
            // 更新总重量显示
            const totalWeightEl = packagingList.querySelector(`[data-packaging-total-weight="${idx}"]`);
            if (totalWeightEl) {
              totalWeightEl.textContent = totalWeight.toFixed(2);
            }
            
            // 更新合计行
            updatePackagingTotals();
          }
        }
        updateFoodMakingOrderTotalPrice();
      } else if (e.target.hasAttribute('data-packaging-cost')) {
        // 允许手动修改费用
        const idx = parseInt(e.target.getAttribute('data-packaging-cost'));
        if (currentFoodMakingPackaging[idx]) {
          currentFoodMakingPackaging[idx].cost = parseFloat(e.target.value) || 0;
        }
        // 更新合计行
        updatePackagingTotals();
        updateFoodMakingOrderTotalPrice();
      }
    });
  }
  
  // 预估快递费用现在是自动计算的，不需要手动输入
  // 优惠折扣已移除，订单总价直接乘以2
}

// 更新鲜食制作订单总价
function updateFoodMakingOrderTotalPrice() {
  // 重新计算所有费用
  const customerId = $('o-customerId') ? $('o-customerId').value : '';
  const recipeId = $('ofm-recipe-select') ? $('ofm-recipe-select').value : '';
  
  if (!customerId || !recipeId) return;
  
  const customer = store.customers.find(c => c.id === customerId);
  const recipe = store.recipes.find(r => r.id === recipeId);
  
  if (!customer || !recipe) return;
  
  const estKcal = customer.estKcal || 0;
  const recipeTotalKcal = recipe.totalKcal || 0;
  const ratio = (estKcal > 0 && recipeTotalKcal > 0) ? (estKcal / recipeTotalKcal) : 0;
  const mealsPerDay = customer.mealsPerDay || 1;
  const days = parseInt(($('ofm-days') ? $('ofm-days').value : '') || '1') || 1;
  const totalServings = mealsPerDay * days;
  const servingWeight = ratio > 0 ? ((recipe.totalWeight || 0) * ratio / mealsPerDay) : 0;
  const totalWeight = servingWeight * totalServings;
  
  // 计算食材总费用
  let totalIngredientCost = 0;
  (recipe.ingredients || []).forEach((ingItem) => {
    const ingredient = store.ingredients.find(i => i.id === ingItem.ingredientId);
    if (ingredient) {
      const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
      if (pricePer500 > 0) {
        const singleServingsAmount = ratio > 0 ? (ingItem.weight * ratio / mealsPerDay) : 0;
        const totalAmount = singleServingsAmount * totalServings;
        if (totalAmount > 0) {
          const cookingLoss = recipe.cookingLoss || 7;
          const totalAmountWithLoss = totalAmount * (1 + cookingLoss / 100);
          const cost = parseFloat(((totalAmountWithLoss * pricePer500) / 500).toFixed(2));
          totalIngredientCost += cost;
        }
      }
    }
  });
  
  // 计算预估人工成本：向上取整（总重量（净重）/4000）*20
  const laborCost = Math.ceil(totalWeight / 4000) * 20;
  
  // 计算包装总费用和包装总重量
  const packagingTotalCost = currentFoodMakingPackaging.reduce((sum, item) => {
    return sum + (parseFloat(item.cost) || 0);
  }, 0);
  const packagingTotalWeight = currentFoodMakingPackaging.reduce((sum, item) => {
    return sum + (parseFloat(item.totalWeight) || 0);
  }, 0);
  
  // 计算预估快递费用（根据快递类型）
  // 包裹总重=总重量（净重）*（1+制作损耗）+包装总重量
  const cookingLoss = recipe.cookingLoss || 7;
  const packageTotalWeight = totalWeight * (1 + cookingLoss / 100) + packagingTotalWeight;
  const shippingTypeSelect = document.getElementById('ofm-shipping-type');
  let shippingType = shippingTypeSelect ? shippingTypeSelect.value : currentFoodMakingShippingType || 'remote';
  let shippingCost = 0;
  let shippingDescText = '';
  if (shippingType === 'local') {
    shippingCost = 20;
    shippingDescText = '（同城快递固定 ¥20）';
  } else if (shippingType === 'none') {
    shippingCost = 0;
    shippingDescText = '（无需快递，费用为 0）';
  } else {
    shippingType = 'remote';
    shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
    shippingDescText = `（自动计算：23 + (包裹总重${(packageTotalWeight / 1000).toFixed(2)}kg - 1) × 13 + 5）`;
  }
  currentFoodMakingShippingType = shippingType;
  if (shippingTypeSelect && shippingTypeSelect.value !== shippingType) {
    shippingTypeSelect.value = shippingType;
  }
  
  // 计算订单总价：订单总价=（食材总费用+包装总费用+预估人工成本+预估快递费用）*2
  const subtotalCost = totalIngredientCost + packagingTotalCost + laborCost + shippingCost;
  // 订单总价四舍五入为整数
  const orderTotalPriceAuto = Math.round(subtotalCost * 2);
  latestFoodMakingAutoPrice = orderTotalPriceAuto;
  const displayOrderTotalPrice = manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : orderTotalPriceAuto;
  const displayOrderTotalPriceRounded = Math.round(displayOrderTotalPrice || 0);
  if (manualFoodMakingOrderPrice != null) {
    manualFoodMakingOrderPrice = displayOrderTotalPriceRounded;
  }
  const orderPriceDescText = manualFoodMakingOrderPrice != null ? '（已手动改价）' : '（自动计算并取整数）';
  
  // 更新人工成本显示
  const laborCostEl = document.getElementById('ofm-labor-cost');
  if (laborCostEl) {
    laborCostEl.textContent = `¥${laborCost.toFixed(2)}`;
    const descEl = laborCostEl.nextElementSibling;
    if (descEl) {
      descEl.textContent = `（自动计算：向上取整（总重量${totalWeight.toFixed(2)}g÷4000）×20）`;
    }
  }
  
  // 更新快递费用显示
  const shippingCostEl = document.getElementById('ofm-shipping-cost');
  if (shippingCostEl) {
    shippingCostEl.textContent = `¥${shippingCost.toFixed(2)}`;
  }
  const shippingDescEl = document.getElementById('ofm-shipping-cost-desc');
  if (shippingDescEl) {
    shippingDescEl.textContent = shippingDescText;
  }
  
  // 更新订单总价显示
  const orderTotalPriceEl = document.getElementById('ofm-order-total-price');
  if (orderTotalPriceEl) {
    orderTotalPriceEl.textContent = `¥${displayOrderTotalPriceRounded}`;
  }
  const orderTotalPriceDescEl = document.getElementById('ofm-order-total-price-desc');
  if (orderTotalPriceDescEl) {
    orderTotalPriceDescEl.textContent = orderPriceDescText;
  }

  const priceEditBtn = document.getElementById('ofm-price-edit');
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  const manualPriceInput = document.getElementById('ofm-manual-price');
  const isEditing = priceEditArea ? priceEditArea.dataset.editing === 'true' : false;

  if (priceEditBtn && priceEditArea) {
    if (manualFoodMakingOrderPrice != null) {
      priceEditBtn.style.display = 'none';
      priceEditArea.style.display = 'flex';
      priceEditArea.dataset.editing = 'true';
    } else if (isEditing) {
      priceEditBtn.style.display = 'none';
      priceEditArea.style.display = 'flex';
    } else {
      priceEditBtn.style.display = 'inline-flex';
      priceEditArea.style.display = 'none';
    }
  }

  if (manualPriceInput) {
    if (manualFoodMakingOrderPrice != null) {
      manualPriceInput.value = manualFoodMakingOrderPrice;
    } else if (!isEditing) {
      manualPriceInput.value = Math.round(orderTotalPriceAuto || 0);
    }
  }
}

function handleFoodMakingShippingChange(value) {
  currentFoodMakingShippingType = value || 'remote';
  updateFoodMakingOrderTotalPrice();
}

function openFoodMakingManualPriceEditor() {
  const priceEditBtn = document.getElementById('ofm-price-edit');
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  const manualPriceInput = document.getElementById('ofm-manual-price');
  if (!priceEditArea || !manualPriceInput || !priceEditBtn) return;
  priceEditBtn.style.display = 'none';
  priceEditArea.style.display = 'flex';
  priceEditArea.dataset.editing = 'true';
  const baseValue = manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : (latestFoodMakingAutoPrice || 0);
  manualPriceInput.value = Math.round(baseValue || 0);
  manualPriceInput.focus();
  if (typeof manualPriceInput.select === 'function') {
    try {
      manualPriceInput.select();
    } catch (err) {
      console.warn('选择手动价格输入框失败:', err);
    }
  }
}

function confirmFoodMakingManualPrice() {
  const manualPriceInput = document.getElementById('ofm-manual-price');
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  if (!manualPriceInput || !priceEditArea) return;
  const value = parseFloat(manualPriceInput.value);
  if (Number.isNaN(value) || value < 0) {
    alert('请输入有效的价格');
    manualPriceInput.focus();
    if (typeof manualPriceInput.select === 'function') {
      try { manualPriceInput.select(); } catch (err) { console.warn(err); }
    }
    return;
  }
  manualFoodMakingOrderPrice = Math.round(value);
  priceEditArea.dataset.editing = 'true';
  updateFoodMakingOrderTotalPrice();
}

function resetFoodMakingManualPrice() {
  const priceEditBtn = document.getElementById('ofm-price-edit');
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  const manualPriceInput = document.getElementById('ofm-manual-price');
  manualFoodMakingOrderPrice = null;
  if (priceEditArea) {
    priceEditArea.dataset.editing = 'false';
    priceEditArea.style.display = 'none';
  }
  if (priceEditBtn) {
    priceEditBtn.style.display = 'inline-flex';
  }
  if (manualPriceInput) {
    manualPriceInput.value = Math.round(latestFoodMakingAutoPrice || 0);
  }
  updateFoodMakingOrderTotalPrice();
}
// 计算订单总计
function calculateOrderTotals() {
  const customerId = $('o-customerId').value;
  if (!customerId || currentOrderRecipes.length === 0) {
    return;
  }
  
  const customer = store.customers.find(c => c.id === customerId);
  if (!customer || !customer.estKcal) {
    alert('该顾客缺少每日能量估算信息，请先完善顾客信息');
    return;
  }
  
  const estKcal = customer.estKcal; // 顾客每日能量估算
  let totalRecipeCost = 0; // 所有食谱的食材总成本
  let totalWeight = 0; // 订单总重量（g）
  
  // 计算每个食谱的用量和成本
  const recipesWithCalculations = currentOrderRecipes.map(item => {
    const recipe = store.recipes.find(r => r.id === item.recipeId);
    if (!recipe || !recipe.totalKcal || !recipe.totalWeight) {
      return null;
    }
    
    const servings = item.servings || 1;
    const cookingLoss = recipe.cookingLoss || 7; // 制作损耗（%）
    
    // 计算订单中该食谱的用量：每日能量估算 / 食谱总热量 × 食谱中该食材重量 × 份数
    const ratio = estKcal / recipe.totalKcal;
    
    // 计算该食谱在订单中的总重量
    const recipeWeightInOrder = recipe.totalWeight * ratio * servings;
    totalWeight += recipeWeightInOrder;
    
    // 计算该食谱的食材成本
    let recipeCost = 0;
    const ingredientsWithCost = (recipe.ingredients || []).map(ingItem => {
      const ingredient = store.ingredients.find(i => i.id === ingItem.ingredientId);
      if (!ingredient) return null;
      
      // 订单中该食材用量 = 每日能量估算 / 食谱总热量 × 食谱中该食材重量 × 份数
      const orderAmount = ingItem.weight * ratio * servings;
      
      // 实际采购量 = 订单用量 × (1 + 制作损耗 / 100)
      const purchaseAmount = orderAmount * (1 + cookingLoss / 100);
      
      // 转换为统一单位（g）进行计算
      let purchaseAmountInG = purchaseAmount;
      const unit = ingItem.unit || ingredient.unit || 'g';
      if (unit === 'kg') {
        purchaseAmountInG = purchaseAmount * 1000;
      } else if (unit === 'L') {
        purchaseAmountInG = purchaseAmount * 1000;
      } else if (unit !== 'g' && unit !== 'ml') {
        // 其他单位需要每单位重量
        if (ingredient.weightPerUnit) {
          purchaseAmountInG = purchaseAmount * ingredient.weightPerUnit;
        } else {
          console.warn('原料缺少每单位重量，无法计算成本:', ingredient.name);
          return null;
        }
      }
      
      // 食材成本 = 实际采购量(g) / 500 × 可食部单价/500单位
      const ediblePricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
      const ediblePortion = ingredient.ediblePortion || 1;
      const cost = (purchaseAmountInG / 500) * ediblePricePer500;
      
      recipeCost += cost;
      
      return {
        ingredientId: ingItem.ingredientId,
        ingredientName: ingredient.name || '',
        recipeAmount: ingItem.weight,
        orderAmount: orderAmount,
        purchaseAmount: purchaseAmount,
        unit: unit,
        ediblePortion: ediblePortion,
        ediblePricePer500: ediblePricePer500,
        cost: cost
      };
    }).filter(x => x !== null);
    
    return {
      recipeId: recipe.id,
      recipeName: recipe.name || '',
      recipeCode: recipe.code || '',
      servings: servings,
      cookingLoss: cookingLoss,
      sellingPrice: recipe.sellingPrice || null, // 食谱售价（需求确认前）
      ingredients: ingredientsWithCost,
      recipeCost: recipeCost,
      recipeSellingPrice: recipe.sellingPrice || (recipeCost * 2), // 默认售价=成本×2
      cookingSteps: Array.isArray(recipe.cookingSteps) ? [...recipe.cookingSteps] : []
    };
  }).filter(x => x !== null);
  
  // 计算总成本
  recipesWithCalculations.forEach(r => {
    totalRecipeCost += r.recipeCost;
  });
  
  const packagingCost = parseFloat($('o-packagingCost').value) || 0;
  const laborCost = parseFloat($('o-laborCost').value) || 0;
  const shippingCost = parseFloat($('o-shippingCost').value) || 0;
  const totalCost = totalRecipeCost + packagingCost + laborCost + shippingCost;
  
  // 默认总售价 = 总成本 × 2
  const totalSellingPrice = totalCost * 2;
  
  // 保存计算结果到全局变量（供表单提交时使用）
  window.currentOrderCalculations = {
    recipes: recipesWithCalculations,
    totalRecipeCost: totalRecipeCost,
    totalCost: totalCost,
    totalSellingPrice: totalSellingPrice,
    totalWeight: totalWeight
  };
  
  return {
    recipes: recipesWithCalculations,
    totalRecipeCost,
    totalCost,
    totalSellingPrice,
    totalWeight
  };
}

// 分页订单
function paginatedOrders() {
  const searchQ = ($('order-search').value || '').trim().toLowerCase();
  const statusFilter = ($('order-status-filter').value || '').trim();
  
  const filtered = store.orders.filter(order => {
    const matchSearch = !searchQ || 
      (order.orderNumber || '').toLowerCase().includes(searchQ) ||
      (() => {
        const customer = store.customers.find(c => c.id === order.customerId);
        return customer && (
          (customer.petName || '').toLowerCase().includes(searchQ) ||
          (customer.wechat || '').toLowerCase().includes(searchQ)
        );
      })();
    
    const matchStatus = !statusFilter || order.status === statusFilter;
    
    return matchSearch && matchStatus;
  });
  
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / store.orderPageSize));
  if (store.orderPage > totalPages) store.orderPage = totalPages;
  
  const start = (store.orderPage - 1) * store.orderPageSize;
  const pageItems = filtered.slice(start, start + store.orderPageSize);
  
  return { pageItems, total, totalPages };
}
// 渲染订单列表
function buildOrderBasicSection(order) {
  const rows = [
    { label: '订单编号', value: order.orderNumber || '-' },
    { label: '订单制作日期', value: order.productionDate || '-' },
    { label: '订单发货日期', value: order.shippingDate || '-' },
    { label: '备注', value: order.notes ? formatMultiline(order.notes) : '-', raw: true },
    { label: '更新时间', value: formatDateTime(order.updatedAt) }
  ];
  return `<div><div class="detail-section-title">基本信息</div>${buildDetailTable(rows)}</div>`;
}

function buildCustomerSection(customer) {
  if (!customer) {
    return `<div><div class="detail-section-title">顾客与宠物信息</div><div class="detail-empty">未找到关联的顾客与宠物信息</div></div>`;
  }
  const rows = [];
  rows.push({ label: '品种', value: customer.breed || '-' });
  rows.push({ label: '年龄/月龄', value: formatAgeDisplay(customer) });
  rows.push({ label: '体重', value: customer.weightKg != null ? `${formatNumber(customer.weightKg, 2)} kg` : '-' });
  rows.push({ label: '性别', value: zh(customer.sex, sexMap) });
  rows.push({ label: '是否绝育', value: zh(customer.neutered, neuterMap) });
  rows.push({ label: '生命阶段', value: zh(customer.lifeStage, lifeMap) });
  const activityLabel = customer.activity ? zh(customer.activity, actMap) : '-';
  const kcalFactor = customer.kcalFactor != null ? customer.kcalFactor : activityKcalFactor(customer.activity);
  rows.push({ label: '日均活动水平', value: activityLabel !== '-' ? `${activityLabel}（热量系数 ${kcalFactor}）` : '-' });
  rows.push({ label: '每日吃几顿饭', value: customer.mealsPerDay != null ? customer.mealsPerDay : '-' });
  rows.push({ label: '每日能量估算', value: describeEstKcal(customer), raw: true });
  if (customer.lifeStage === 'puppy') {
    const monthAge = customer.monthAge != null ? customer.monthAge : calcAgeMonths(customer.birthday);
    const monthFactor = customer.monthFactor != null ? customer.monthFactor : monthFactorFromMonths(monthAge);
    rows.push({ label: '月龄', value: monthAge != null ? `${monthAge} 个月` : '-' });
    rows.push({ label: '月龄系数', value: monthFactor != null ? monthFactor : '-' });
  }
  if (customer.lifeStage === 'lactation') {
    rows.push({ label: '哺乳阶段', value: zh(customer.lactStage, lactMap) });
    const lactFactor = customer.lactFactor != null ? customer.lactFactor : lactFactorFromStage(customer.lactStage);
    rows.push({ label: '哺乳阶段因子', value: lactFactor != null ? lactFactor : '-' });
    rows.push({ label: '产仔数', value: customer.litterCount != null ? customer.litterCount : '-' });
  }
  rows.push({ label: '热量系数', value: kcalFactor != null ? kcalFactor : '-' });
  rows.push({ label: '体况评分', value: customer.bcs != null ? customer.bcs : '-' });
  rows.push({ label: '过敏/不耐受', value: formatMultiline(customer.allergies) , raw: true });
  rows.push({ label: '挑食/尽量不吃', value: formatMultiline(customer.avoid), raw: true });
  rows.push({ label: '非常喜欢吃', value: formatMultiline(customer.fav), raw: true });
  rows.push({ label: '症状史/疾病史', value: formatMultiline(customer.med), raw: true });
  rows.push({ label: '备注', value: formatMultiline(customer.notes), raw: true });
  rows.push({ label: '收货信息', value: formatMultiline(customer.address), raw: true });
  return `<div><div class="detail-section-title">顾客与宠物信息</div>${buildDetailTable(rows)}</div>`;
}

function buildFoodMakingSection(order, customer) {
  if (!order.foodMakingData) {
    return '';
  }
  const data = order.foodMakingData;
  const recipe = data.recipeId ? store.recipes.find(r => r.id === data.recipeId) : null;
  const days = data.days || 1;
  const mealsPerDay = customer && customer.mealsPerDay ? customer.mealsPerDay : 1;
  const estKcal = customer && customer.estKcal ? customer.estKcal : 0;
  const recipeTotalKcal = recipe && recipe.totalKcal ? recipe.totalKcal : 0;
  const ratio = (estKcal > 0 && recipeTotalKcal > 0 && mealsPerDay > 0) ? (estKcal / recipeTotalKcal) : 0;
  const totalServings = mealsPerDay * days;
  const recipeTotalWeight = recipe && recipe.totalWeight ? recipe.totalWeight : 0;
  const servingWeight = ratio > 0 ? (recipeTotalWeight * ratio / (mealsPerDay || 1)) : 0;
  const totalWeight = servingWeight * totalServings;
  const totalKcal = recipe && ratio > 0 ? (recipe.totalKcal * ratio * days) : 0;
  const cookingLoss = recipe && recipe.cookingLoss != null ? recipe.cookingLoss : 7;

  const infoRows = [];
  if (data.recipeId) {
    if (recipe) {
      infoRows.push({ label: '食谱编号', value: recipe.code || '-' });
      infoRows.push({ label: '适用生命阶段', value: zh(recipe.lifeStage, lifeMap) });
      infoRows.push({ label: '营养参考标准', value: nutritionLabelMap[recipe.nutritionStandard] || recipe.nutritionStandard || '-' });
      infoRows.push({ label: '食谱类型', value: recipeTypeLabelMap[recipe.recipeType] || '-' });
      infoRows.push({ label: '食谱制作软件', value: recipe.software || '-' });
    } else {
      infoRows.push({ label: '食谱编号', value: `原食谱已删除（ID：${data.recipeId}）` });
    }
  }
  infoRows.push({ label: '制作天数', value: days });
  infoRows.push({ label: '每份重量', value: servingWeight > 0 ? `${formatNumber(servingWeight, 2)} g` : '-' });
  infoRows.push({ label: '总份数', value: totalServings > 0 ? totalServings : '-' });
  infoRows.push({ label: '总重量（净重）', value: totalWeight > 0 ? `${formatNumber(totalWeight, 2)} g` : '-' });
  infoRows.push({ label: '总热量', value: totalKcal > 0 ? `${formatNumber(totalKcal, 2)} kcal` : '-' });
  infoRows.push({ label: '制作损耗', value: `${formatNumber(cookingLoss, 0)}%` });

  const ingredientRows = [];
  let totalIngredientCost = 0;
  const ingredientsList = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  ingredientsList.forEach((item, idx) => {
    const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
    const unit = item.unit || (ingredient ? ingredient.unit : 'g');
    const singleAmount = ratio > 0 && mealsPerDay > 0 ? (item.weight * ratio / mealsPerDay) : 0;
    const totalAmount = singleAmount * totalServings;
    const pricePer500 = ingredient ? (ingredient.ediblePricePer500 || ingredient.pricePer500 || 0) : 0;
    const totalAmountWithLoss = totalAmount * (1 + (cookingLoss || 0) / 100);
    const cost = pricePer500 > 0 ? (totalAmountWithLoss * pricePer500) / 500 : 0;
    totalIngredientCost += cost;
    const weightRatio = (unit === 'g' && totalWeight > 0) ? `${((totalAmount / totalWeight) * 100).toFixed(2)}%` : '-';
    const nameText = ingredient ? `${ingredient.name || '-'}${ingredient.description ? '-' + ingredient.description : ''}${ingredient.brand ? '（' + ingredient.brand + '）' : ''}` : '-';
    ingredientRows.push({
      index: idx + 1,
      code: ingredient ? (ingredient.code || '-') : '-',
      name: nameText,
      unit,
      totalAmount,
      weightRatio,
      pricePer500,
      cost
    });
  });

  let ingredientsTable = '<div class="detail-empty">未找到食材数据</div>';
  if (ingredientRows.length > 0) {
    const rowsHtml = ingredientRows.map(row => {
      return `<tr>
        <td>${row.index}</td>
        <td>${escapeHtml(row.code)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.unit)}</td>
        <td>${formatNumber(row.totalAmount, 2)}</td>
        <td>${row.weightRatio}</td>
        <td>${row.pricePer500 ? `¥${Number(row.pricePer500).toFixed(2)}` : '-'}</td>
        <td>${formatCurrency(row.cost)}</td>
      </tr>`;
    }).join('');
    ingredientsTable = `
      <table class="detail-table">
        <thead>
          <tr>
            <th style="width:50px;">序号</th>
            <th style="width:100px;">原料编号</th>
            <th>原料名称</th>
            <th style="width:70px;">单位</th>
            <th style="width:110px;">总用量</th>
            <th style="width:110px;">重量占比</th>
            <th style="width:130px;">单价（¥/500单位）</th>
            <th style="width:120px;">费用（含损耗）</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr>
          <th colspan="7" style="text-align:right;">食材总费用</th>
          <th>${formatCurrency(totalIngredientCost)}</th>
        </tr></tfoot>
      </table>`;
  }

  const packagingList = Array.isArray(data.packaging) ? data.packaging : [];
  const packagingRows = [];
  let packagingTotalCost = 0;
  let packagingTotalWeight = 0;
  packagingList.forEach((item, idx) => {
    const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
    const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : null;
    const cost = Number(item.cost) || 0;
    const totalWeightItem = Number(item.totalWeight) || 0;
    packagingTotalCost += cost;
    packagingTotalWeight += totalWeightItem;
    const project = ingredient ? (ingredient.name || '-') : (item.name ? item.name.split('-')[0] : '-');
    const noteParts = [];
    if (ingredient && ingredient.description) noteParts.push(ingredient.description);
    if (ingredient && ingredient.brand) noteParts.push(ingredient.brand);
    if (noteParts.length === 0 && item.name) {
      const splits = item.name.split('-');
      if (splits.length > 1) noteParts.push(splits.slice(1).join('-'));
    }
    packagingRows.push({
      index: idx + 1,
      project: project,
      note: noteParts.length ? noteParts.join(' / ') : '-',
      quantity: Number(item.quantity) || 0,
      unit: item.unit || (ingredient ? (ingredient.unit || '') : ''),
      unitPrice,
      cost,
      totalWeight: totalWeightItem
    });
  });

  let packagingTable = '<div class="detail-empty">未使用包装物料</div>';
  if (packagingRows.length > 0) {
    const rowsHtml = packagingRows.map(row => {
      const unitPriceDisplay = row.unitPrice != null ? `¥${Number(row.unitPrice).toFixed(4)}` : '-';
      return `<tr>
        <td>${row.index}</td>
        <td>${escapeHtml(row.project)}</td>
        <td>${row.note !== '-' ? escapeHtml(row.note) : '-'}</td>
        <td>${formatNumber(row.quantity, 2)}</td>
        <td>${escapeHtml(row.unit || '')}</td>
        <td>${unitPriceDisplay}</td>
        <td>${formatCurrency(row.cost)}</td>
        <td>${formatNumber(row.totalWeight, 2)}</td>
      </tr>`;
    }).join('');
    packagingTable = `
      <table class="detail-table">
        <thead>
          <tr>
            <th style="width:50px;">序号</th>
            <th style="width:120px;">包装项目</th>
            <th>说明</th>
            <th style="width:110px;">用量</th>
            <th style="width:70px;">单位</th>
            <th style="width:130px;">单价（¥）</th>
            <th style="width:120px;">总费用</th>
            <th style="width:120px;">总重量(g)</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr>
          <th colspan="6" style="text-align:right;">合计</th>
          <th>${formatCurrency(packagingTotalCost)}</th>
          <th>${formatNumber(packagingTotalWeight, 2)}</th>
        </tr></tfoot>
      </table>`;
  }

  const laborCost = totalWeight > 0 ? Math.ceil(totalWeight / 4000) * 20 : 0;
  const shippingType = data.shippingType || 'remote';
  const shippingLabelMap = { remote: '异地快递', local: '同城快递', none: '无需快递' };
  const packageTotalWeight = totalWeight * (1 + (cookingLoss || 0) / 100) + packagingTotalWeight;
  let shippingCost = 0;
  if (shippingType === 'local') {
    shippingCost = 20;
  } else if (shippingType === 'none') {
    shippingCost = 0;
  } else {
    shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
  }
  const manualPrice = data.isManualPrice && data.manualOrderTotalPrice != null ? data.manualOrderTotalPrice : null;
  const autoTotalPrice = data.autoOrderTotalPrice != null ? data.autoOrderTotalPrice : Math.round((totalIngredientCost + packagingTotalCost + laborCost + shippingCost) * 2);

  const costRows = [
    { label: '食材总费用', value: formatCurrency(totalIngredientCost) },
    { label: '包装总费用', value: formatCurrency(packagingTotalCost) },
    { label: '包装总重量', value: `${formatNumber(packagingTotalWeight, 2)} g` },
    { label: '预估人工成本', value: formatCurrency(laborCost) },
    { label: '预估快递费用', value: formatCurrency(shippingCost) },
    { label: '快递类型', value: shippingLabelMap[shippingType] || '异地快递' },
    { label: '是否手动改价', value: manualPrice != null ? '是' : '否' }
  ];
  if (manualPrice != null) {
    costRows.push({ label: '手动改价金额', value: formatCurrency(manualPrice, 0) });
  }
  costRows.push({ label: '自动计算总价（参考）', value: formatCurrency(autoTotalPrice, 0) });

  return `
    <div>
      <div class="detail-section-title">鲜食制作概况</div>
      ${buildDetailTable(infoRows)}
      <div class="detail-section-title">食材总用量</div>
      ${ingredientsTable}
      <div class="detail-section-title">包装清单</div>
      ${packagingTable}
      <div class="detail-section-title">费用汇总</div>
      ${buildDetailTable(costRows)}
    </div>
  `;
}

function buildRecipeSection(order) {
  if (!order.recipeData) {
    return '';
  }
  const data = order.recipeData;
  const infoRows = [];
  infoRows.push({ label: '食谱编号', value: data.code || '-' });
  infoRows.push({ label: '适用生命阶段', value: zh(data.lifeStage, lifeMap) });
  infoRows.push({ label: '营养参考标准', value: nutritionLabelMap[data.nutritionStandard] || data.nutritionStandard || '-' });
  infoRows.push({ label: '食谱类型', value: recipeTypeLabelMap[data.recipeType] || '-' });
  infoRows.push({ label: '食谱制作软件', value: data.software || '-' });
  infoRows.push({ label: '制作损耗', value: data.cookingLoss != null ? `${data.cookingLoss}%` : '-' });
  if (data.sellingPrice != null && data.sellingPrice !== '') {
    infoRows.push({ label: '售价', value: formatCurrency(data.sellingPrice) });
  }

  const ingredientRows = [];
  const list = Array.isArray(data.ingredients) ? data.ingredients : [];
  list.forEach((item, idx) => {
    const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
    const unit = item.unit || (ingredient ? ingredient.unit : 'g');
    const nameText = ingredient ? `${ingredient.name || '-'}${ingredient.description ? '-' + ingredient.description : ''}${ingredient.brand ? '（' + ingredient.brand + '）' : ''}` : '-';
    ingredientRows.push({
      index: idx + 1,
      code: ingredient ? ingredient.code || '-' : '-',
      name: nameText,
      weight: item.weight != null ? item.weight : '-',
      unit
    });
  });
  let ingredientsTable = '<div class="detail-empty">未录入食材</div>';
  if (ingredientRows.length > 0) {
    const rowsHtml = ingredientRows.map(row => `
      <tr>
        <td>${row.index}</td>
        <td>${escapeHtml(row.code)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.weight !== '-' ? formatNumber(row.weight, 2) : '-'}</td>
        <td>${escapeHtml(row.unit || '')}</td>
      </tr>
    `).join('');
    ingredientsTable = `
      <table class="detail-table">
        <thead>
          <tr>
            <th style="width:50px;">序号</th>
            <th style="width:120px;">原料编号</th>
            <th>原料名称</th>
            <th style="width:110px;">重量</th>
            <th style="width:80px;">单位</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
  }

  const nutritionRows = [];
  nutritionRows.push({ label: '蛋白质（DM）%', value: data.protein != null ? formatNumber(data.protein, 2) : '-' });
  nutritionRows.push({ label: '脂肪（DM）%', value: data.fat != null ? formatNumber(data.fat, 2) : '-' });
  nutritionRows.push({ label: '碳水化合物（DM）%', value: data.carb != null ? formatNumber(data.carb, 2) : '-' });
  nutritionRows.push({ label: '膳食纤维（DM）%', value: data.fiber != null ? formatNumber(data.fiber, 2) : '-' });
  nutritionRows.push({ label: '灰分（DM）%', value: data.ash != null ? formatNumber(data.ash, 2) : '-' });
  nutritionRows.push({ label: '水分 %', value: data.moisture != null ? formatNumber(data.moisture, 2) : '-' });
  nutritionRows.push({ label: '钙磷比', value: data.caPratio || '-' });
  nutritionRows.push({ label: '总热量', value: data.totalKcal != null ? `${formatNumber(data.totalKcal, 2)} kcal` : '-' });
  nutritionRows.push({ label: '总重量', value: data.totalWeight != null ? `${formatNumber(data.totalWeight, 2)} g` : '-' });
  nutritionRows.push({ label: '热量密度', value: data.kcalDensity != null ? `${formatNumber(data.kcalDensity, 2)} kcal/kg` : '-' });

  const steps = Array.isArray(data.cookingSteps) ? data.cookingSteps.filter(step => step && step.trim()) : [];
  const stepsHtml = steps.length ? `<table class="detail-table"><thead><tr><th style="width:60px;">步骤</th><th>制作说明</th></tr></thead><tbody>${steps.map((step, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(step)}</td></tr>`).join('')}</tbody></table>` : '<div class="detail-empty">未填写制作流程</div>';

  return `
    <div>
      <div class="detail-section-title">食谱基本信息</div>
      ${buildDetailTable(infoRows)}
      <div class="detail-section-title">食材配方</div>
      ${ingredientsTable}
      <div class="detail-section-title">营养数据</div>
      ${buildDetailTable(nutritionRows)}
      <div class="detail-section-title">制作流程</div>
      ${stepsHtml}
    </div>
  `;
}

function openOrderDetail(orderId) {
  const card = $('order-detail-card');
  const content = $('order-detail-content');
  if (!card || !content) return;
  const order = store.orders.find(o => o.id === orderId);
  if (!order) {
    alert('未找到订单信息');
    return;
  }
  const customer = store.customers.find(c => c.id === order.customerId) || null;

  const sections = [];
  sections.push(buildOrderBasicSection(order));
  sections.push(buildCustomerSection(customer));
  if (order.orderType === 'food_making' || order.orderType === 'both') {
    sections.push(buildFoodMakingSection(order, customer));
  }
  if (order.orderType === 'recipe_only' || order.orderType === 'both') {
    sections.push(buildRecipeSection(order));
  }

  content.innerHTML = sections.filter(Boolean).join('');
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeOrderDetail() {
  const card = $('order-detail-card');
  const content = $('order-detail-content');
  if (card) card.style.display = 'none';
  if (content) content.innerHTML = '';
}

function renderOrdersList() {
  const list = $('orders-list');
  if (!list) return;
  
  const estimateFoodMakingPayment = (order) => {
    try {
      if (!order || order.orderType !== 'food_making') return 0;
      const customer = store.customers.find(c => c.id === order.customerId);
      const recipeId = order.foodMakingData && order.foodMakingData.recipeId;
      const recipe = recipeId ? store.recipes.find(r => r.id === recipeId) : null;
      if (!customer || !recipe) return 0;
      const days = order.foodMakingData && order.foodMakingData.days ? order.foodMakingData.days : 1;
      const estKcal = customer.estKcal || 0;
      const recipeTotalKcal = recipe.totalKcal || 0;
      const mealsPerDay = customer.mealsPerDay || 1;
      if (!(estKcal > 0 && recipeTotalKcal > 0 && mealsPerDay > 0)) return 0;
      const ratio = estKcal / recipeTotalKcal;
      const totalServings = mealsPerDay * days;
      const servingWeight = (recipe.totalWeight || 0) * ratio / mealsPerDay;
      const totalWeight = servingWeight * totalServings;
      let totalIngredientCost = 0;
      (recipe.ingredients || []).forEach((ingItem) => {
        const ingredient = store.ingredients.find(i => i.id === ingItem.ingredientId);
        if (!ingredient) return;
        const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
        if (!(pricePer500 > 0)) return;
        const singleServingsAmount = ingItem.weight * ratio / mealsPerDay;
        const totalAmount = singleServingsAmount * totalServings;
        if (!(totalAmount > 0)) return;
        const totalAmountWithLoss = totalAmount * (1 + (recipe.cookingLoss || 7) / 100);
        const cost = ((totalAmountWithLoss * pricePer500) / 500);
        totalIngredientCost += cost;
      });
      const ingredientCost = totalIngredientCost;
      const packagingList = Array.isArray(order.foodMakingData && order.foodMakingData.packaging)
        ? order.foodMakingData.packaging
        : [];
      const packagingCost = packagingList.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
      const packagingWeight = packagingList.reduce((sum, item) => sum + (parseFloat(item.totalWeight) || 0), 0);
      const laborCost = Math.ceil(totalWeight / 4000) * 50;
      const cookingLoss = recipe.cookingLoss || 7;
      const packageTotalWeight = totalWeight * (1 + cookingLoss / 100) + packagingWeight;
      const shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
      const subtotal = ingredientCost + packagingCost + laborCost + shippingCost;
      const totalPrice = Math.round(subtotal * 2);
      return Number.isFinite(totalPrice) && totalPrice > 0 ? totalPrice : 0;
    } catch (error) {
      console.warn('estimateFoodMakingPayment error:', error);
      return 0;
    }
  };
  
  const { pageItems, total, totalPages } = paginatedOrders();
  
  if (pageItems.length === 0) {
    list.innerHTML = '<div class="muted" style="text-align:center; padding:20px">暂无订单数据</div>';
    $('orders-total').textContent = '共 0 条';
    $('orders-pageinfo').textContent = '';
    $('orders-prev').disabled = true;
    $('orders-next').disabled = true;
    return;
  }
  
  const orderTypeMap = { recipe_only: '纯食谱定制', food_making: '鲜食制作', both: '食谱+鲜食' };
  const statusMap = {
    pending: '待顾客确认',
    confirmed: '顾客已确认',
    production: '制作完成',
    shipped: '已发货',
    after_sale: '申请售后',
    completed: '已完成'
  };
  
  list.innerHTML = pageItems.map(order => {
    const customer = store.customers.find(c => c.id === order.customerId);
    const petName = customer ? (customer.petName || '') : '';
    const wechat = customer ? (customer.wechat || '') : '';
    let customerLabel = '-';
    if (petName && wechat) {
      customerLabel = `${petName}（${wechat}）`;
    } else if (petName) {
      customerLabel = petName;
    } else if (wechat) {
      customerLabel = wechat;
    }
    const orderType = orderTypeMap[order.orderType] || '-';
    const status = statusMap[order.status] || '-';
    const orderDate = order.orderDate || '-';
    let recipeName = '-';
    if (order.orderType === 'recipe_only') {
      recipeName = order.recipeData && order.recipeData.name ? order.recipeData.name : '-';
    } else if (order.orderType === 'food_making') {
      const recipeId = order.foodMakingData && order.foodMakingData.recipeId;
      const recipe = recipeId ? store.recipes.find(r => r.id === recipeId) : null;
      recipeName = recipe ? (recipe.name || '-') : '-';
    }
    const parseNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : NaN;
    };
    let totalPrice = parseNumber(order.totalSellingPrice);
    if (!(totalPrice > 0)) {
      let fallbackPrice = parseNumber(order.paymentAmount);
      if (!(fallbackPrice > 0)) {
        fallbackPrice = parseNumber(order.orderAmount);
      }
      if (!(fallbackPrice > 0) && order.orderType === 'food_making') {
        fallbackPrice = estimateFoodMakingPayment(order);
      }
      totalPrice = fallbackPrice > 0 ? fallbackPrice : 0;
    }
    const paymentDisplay = Math.round(totalPrice || 0);
    
    return `
      <div class="list-item" data-id="${order.id}">
        <div class="list-item-row" style="grid-template-columns: 1.2fr 1.4fr 1fr 1fr 1.4fr 1fr;">
          <div>${orderDate || '-'}</div>
          <div>${customerLabel}</div>
          <div>${orderType}</div>
          <div>${status}</div>
          <div>${recipeName || '-'}</div>
          <div>¥${paymentDisplay}</div>
        </div>
        <div class="item-actions">
          <button class="btn small" data-detail="${order.id}">详细信息</button>
          <button class="btn small" data-edit="${order.id}">编辑</button>
          <button class="btn small" data-del="${order.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  // 绑定操作按钮（详细信息、编辑、删除）
  list.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      openOrderDetail(btn.dataset.detail);
    });
  });
  
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      openOrderForm(btn.dataset.edit);
    });
  });
  
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('确定要删除这个订单吗？')) {
        const idx = store.orders.findIndex(x => x.id === btn.dataset.del);
        if (idx >= 0) {
          store.orders.splice(idx, 1);
          saveApp();
          renderOrdersList();
        }
      }
    });
  });
  
  $('orders-total').textContent = `共 ${total} 条`;
  $('orders-pageinfo').textContent = `第 ${store.orderPage}/${totalPages} 页`;
  $('orders-prev').disabled = store.orderPage <= 1;
  $('orders-next').disabled = store.orderPage >= totalPages;
}

// 打开订单表单
function openOrderForm(id = null) {
  const card = $('order-form-card');
  const title = $('order-form-title');
  const form = $('order-form');
  
  if (!card || !form) return;

  closeOrderDetail();
  
  // 填充顾客下拉框
  const customerSelect = $('o-customerId');
  const orderNumberField = $('order-number-field');
  if (customerSelect) {
    customerSelect.innerHTML = '<option value="">请选择宠物与主人</option>';
    store.customers.forEach(customer => {
      const option = document.createElement('option');
      option.value = customer.id;
      option.textContent = `${customer.petName || '-'} (${customer.wechat || '-'})`;
      customerSelect.appendChild(option);
    });
  }
  
  let order = null; // 在函数作用域内声明order变量
  if (id) {
    order = store.orders.find(x => x.id === id);
    if (!order) return;
    
    if (title) title.textContent = '编辑订单';
    $('order-id').value = order.id;
    $('o-orderNumber').value = order.orderNumber || '';
    if (orderNumberField) orderNumberField.style.display = order.orderType ? 'block' : 'none';
    // 订单创建日期只读，显示保存的日期
    $('o-orderDate').value = order.orderDate || new Date().toISOString().split('T')[0];
    $('o-orderDate').readOnly = true;
    $('o-customerId').value = order.customerId || '';
    $('o-orderType').value = order.orderType || 'recipe_only';
    $('o-status').value = order.status || 'pending';
    $('o-notes').value = order.notes || '';
    
    // 显示顾客信息
    renderOrderCustomerInfo(order.customerId);
    
    // 根据订单类型显示/隐藏内容
    toggleOrderTypeContent();
    const numberEl = $('o-orderNumber');
    if (numberEl) numberEl.value = order.orderNumber || '';
    
    // 如果是纯食谱定制类型，加载订单中的食谱数据
    if (order.orderType === 'recipe_only') {
      // 加载订单中的食谱数据（如果订单中保存了食谱数据）
      if (order.recipeData) {
        $('or-name').value = order.recipeData.name || '';
        $('or-lifeStage').value = order.recipeData.lifeStage || 'adult';
        $('or-nutritionStandard').value = order.recipeData.nutritionStandard || 'FEDIAF';
        $('or-software').value = order.recipeData.software || 'ADF';
        $('or-recipeType').value = order.recipeData.recipeType || 'standard';
        $('or-code').value = order.recipeData.code || '';
        $('or-cookingLoss').value = order.recipeData.cookingLoss || 7;
        $('or-sellingPrice').value = order.recipeData.sellingPrice || '';
        $('or-protein').value = order.recipeData.protein || '';
        $('or-fat').value = order.recipeData.fat || '';
        $('or-carb').value = order.recipeData.carb || '';
        $('or-fiber').value = order.recipeData.fiber || '';
        $('or-ash').value = order.recipeData.ash || '';
        $('or-moisture').value = order.recipeData.moisture || '';
        $('or-caPratio').value = order.recipeData.caPratio || '';
        $('or-totalKcal').value = order.recipeData.totalKcal || '';
        $('or-totalWeight').value = order.recipeData.totalWeight || '';
        $('or-kcalDensity').value = order.recipeData.kcalDensity || '';
        
        currentOrderRecipeIngredients = Array.isArray(order.recipeData.ingredients) ? [...order.recipeData.ingredients] : [];
        currentOrderRecipeCookingSteps = Array.isArray(order.recipeData.cookingSteps) ? [...order.recipeData.cookingSteps] : [];
      } else {
        // 如果没有保存的食谱数据，初始化空数据
        currentOrderRecipeIngredients = [];
        currentOrderRecipeCookingSteps = [];
      }
      
      renderOrderRecipeIngredientsList();
      renderOrderRecipeCookingSteps();
    } else if (order.orderType === 'food_making') {
      // 如果是鲜食制作类型，加载订单数据
      // 先填充食谱下拉框，然后再设置值
      populateFoodMakingRecipeSelect();
      
      // 延迟设置值，确保下拉框已填充
      setTimeout(() => {
        if (order.foodMakingData) {
          $('ofm-recipe-select').value = order.foodMakingData.recipeId || '';
          $('ofm-days').value = order.foodMakingData.days || 1;
          currentFoodMakingRecipeId = order.foodMakingData.recipeId;
          currentFoodMakingDays = order.foodMakingData.days || 1;
        } else {
          $('ofm-recipe-select').value = '';
          $('ofm-days').value = 1;
          currentFoodMakingRecipeId = null;
          currentFoodMakingDays = 1;
        }
        
        // 保存订单的日期信息，以便在calculateFoodMakingIngredients后恢复
        const savedProductionDate = order.productionDate || null;
        const savedShippingDate = order.shippingDate || null;
        
        // 加载包装清单、快递费用和优惠折扣
        if (order.foodMakingData) {
          currentFoodMakingPackaging = Array.isArray(order.foodMakingData.packaging) ? [...order.foodMakingData.packaging] : [];
          currentFoodMakingShippingType = order.foodMakingData.shippingType || 'remote';
          const savedManualPrice = order.foodMakingData.manualOrderTotalPrice;
          const hasManualFlag = order.foodMakingData.isManualPrice;
          if ((hasManualFlag || (typeof hasManualFlag === 'undefined' && savedManualPrice != null && savedManualPrice !== '')) && savedManualPrice != null && savedManualPrice !== '') {
            const parsedManualPrice = Number(savedManualPrice);
            manualFoodMakingOrderPrice = Number.isFinite(parsedManualPrice) ? Math.round(parsedManualPrice) : null;
          } else {
            manualFoodMakingOrderPrice = null;
          }
          const savedAutoPrice = order.foodMakingData.autoOrderTotalPrice;
          const parsedAutoPrice = Number(savedAutoPrice);
          latestFoodMakingAutoPrice = Number.isFinite(parsedAutoPrice) ? Math.round(parsedAutoPrice) : 0;
        } else {
          currentFoodMakingPackaging = [];
          currentFoodMakingShippingType = 'remote';
          manualFoodMakingOrderPrice = null;
          latestFoodMakingAutoPrice = 0;
        }
        
        // 重新计算并显示
        calculateFoodMakingIngredients();
        // 确保日期字段、快递费用和优惠折扣已加载（因为calculateFoodMakingIngredients会重新生成HTML）
        setTimeout(() => {
          const productionDateInput = document.getElementById('ofm-production-date');
          const shippingDateInput = document.getElementById('ofm-shipping-date');
          
          // 快递费用现在由系统自动计算，不需要加载额外数据
          
          if (productionDateInput && shippingDateInput) {
            // 优先使用保存的日期
            if (savedProductionDate) {
              productionDateInput.value = savedProductionDate;
            } else {
              // 如果没有保存的日期，设置默认值：订单创建日期的第二天
              const orderDate = order.orderDate || $('o-orderDate').value;
              if (orderDate) {
                // 使用本地时区避免时区问题
                const [year, month, day] = orderDate.split('-').map(Number);
                const orderDateObj = new Date(year, month - 1, day);
                orderDateObj.setDate(orderDateObj.getDate() + 1);
                const productionDate = `${orderDateObj.getFullYear()}-${String(orderDateObj.getMonth() + 1).padStart(2, '0')}-${String(orderDateObj.getDate()).padStart(2, '0')}`;
                productionDateInput.value = productionDate;
              }
            }
            
            if (savedShippingDate) {
              shippingDateInput.value = savedShippingDate;
            } else {
              // 如果没有保存的日期，根据制作日期设置默认值
              if (productionDateInput.value) {
                const [pYear, pMonth, pDay] = productionDateInput.value.split('-').map(Number);
                const productionDateObj = new Date(pYear, pMonth - 1, pDay);
                productionDateObj.setDate(productionDateObj.getDate() + 1);
                const shippingDate = `${productionDateObj.getFullYear()}-${String(productionDateObj.getMonth() + 1).padStart(2, '0')}-${String(productionDateObj.getDate()).padStart(2, '0')}`;
                shippingDateInput.value = shippingDate;
              }
            }
          }
          
          // 重新计算订单总价（因为快递费用和优惠折扣已加载）
          updateFoodMakingOrderTotalPrice();
        }, 200);
      }, 50);
    }
  } else {
    if (title) title.textContent = '新增订单';
    form.reset();
    $('order-id').value = '';
    if (orderNumberField) orderNumberField.style.display = 'none';
    // 订单创建日期自动设置为当前日期，且不可修改
    const today = new Date().toISOString().split('T')[0];
    $('o-orderDate').value = today;
    $('o-orderDate').readOnly = true;
    $('o-orderType').value = '';
    $('o-status').value = 'pending';
    $('o-notes').value = '';
    
    // 隐藏顾客信息
    renderOrderCustomerInfo('');
    
    // 隐藏所有类型的内容
    toggleOrderTypeContent();
    
    // 初始化纯食谱定制类型的数据
    currentOrderRecipeIngredients = [];
    currentOrderRecipeCookingSteps = [];
    editingOrderRecipeIngredientIndex = null;
    selectedOrderRecipeIngredientId = null;
    
    renderOrderRecipeIngredientsList();
    renderOrderRecipeCookingSteps();
    
    // 初始化鲜食制作类型的数据
    currentFoodMakingRecipeId = null;
    currentFoodMakingDays = 1;
    currentFoodMakingPackaging = [];
    currentFoodMakingShippingType = 'remote';
    manualFoodMakingOrderPrice = null;
    latestFoodMakingAutoPrice = 0;
    $('ofm-recipe-select').value = '';
    $('ofm-days').value = 1;
    $('ofm-recipe-info').style.display = 'none';
    $('ofm-ingredients-summary').style.display = 'none';
    
    // 如果订单类型是纯食谱定制，自动生成食谱编号
    if ($('o-orderType').value === 'recipe_only') {
      autoGenerateOrderRecipeCode();
    }
    
    // 填充鲜食制作的食谱下拉框（新增订单时）
    populateFoodMakingRecipeSelect();
  }
  
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
// 设置订单模块
function setupOrdersModule() {
  const newBtn = $('btn-new-order');
  if (newBtn) newBtn.addEventListener('click', () => openOrderForm());
  
  const cancelBtn = $('btn-cancel-order');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const card = $('order-form-card');
      if (card) card.style.display = 'none';
    });
  }

  const closeDetailBtn = $('btn-close-order-detail');
  if (closeDetailBtn) {
    closeDetailBtn.addEventListener('click', closeOrderDetail);
  }
  
  // 添加食谱到订单
  const addRecipeBtn = $('btn-add-recipe-to-order');
  if (addRecipeBtn) {
    addRecipeBtn.addEventListener('click', () => {
      const recipeSelect = $('o-recipe-select');
      const recipeId = recipeSelect ? recipeSelect.value : '';
      
      if (!recipeId) {
        alert('请先选择食谱');
        return;
      }
      
      const recipe = store.recipes.find(r => r.id === recipeId);
      if (!recipe) {
        alert('食谱不存在');
        return;
      }
      
      // 检查是否已添加
      const exists = currentOrderRecipes.find(r => r.recipeId === recipeId);
      if (exists) {
        exists.servings = (exists.servings || 1) + 1;
      } else {
        currentOrderRecipes.push({
          recipeId: recipeId,
          servings: 1
        });
      }
      
      renderOrderRecipesList();
      calculateOrderTotals();
      
      // 清空选择
      if (recipeSelect) recipeSelect.value = '';
    });
  }
  
  // 顾客选择变化时的处理
  const customerSelect = $('o-customerId');
  if (customerSelect) {
    customerSelect.addEventListener('change', () => {
      const customerId = customerSelect.value;
      const orderType = $('o-orderType').value;
      
      // 显示顾客信息
      renderOrderCustomerInfo(customerId);
      
      // 根据订单类型进行不同的计算
      if (orderType === 'food_making') {
        calculateFoodMakingIngredients();
      } else if (orderType === 'recipe_only') {
        // 纯食谱定制类型可能不需要在这里计算
        // calculateOrderTotals(); // 如果将来需要可以启用
      }
    });
  }
  
  // 成本字段变化时重新计算总售价（仅对需要成本计算的订单类型）
  ['o-packagingCost', 'o-laborCost', 'o-shippingCost'].forEach(fieldId => {
    const fieldEl = $(fieldId);
    if (fieldEl) {
      fieldEl.addEventListener('input', () => {
        const orderType = $('o-orderType').value;
        // 这些字段可能只在某些订单类型中使用
        // calculateOrderTotals(); // 如果将来需要可以启用
      });
    }
  });
  
  // 订单类型变化时切换显示内容并重新生成编号
  const orderTypeEl = $('o-orderType');
  if (orderTypeEl) {
    orderTypeEl.addEventListener('change', () => {
      toggleOrderTypeContent();
      if (!$('order-id').value) {
        autoGenerateOrderNumber();
      }
      
      // 如果切换到鲜食制作类型，填充食谱下拉框
      if (orderTypeEl.value === 'food_making') {
        if (!$('order-id').value) {
          currentFoodMakingShippingType = 'remote';
          manualFoodMakingOrderPrice = null;
          latestFoodMakingAutoPrice = 0;
        }
        populateFoodMakingRecipeSelect();
        // 延迟设置日期默认值，确保DOM已更新
        setTimeout(() => {
          const productionDateInput = document.getElementById('ofm-production-date');
          const shippingDateInput = document.getElementById('ofm-shipping-date');
          const orderDate = $('o-orderDate').value;
          
          if (orderDate && productionDateInput && shippingDateInput) {
            // 如果制作日期为空，设置默认值
            if (!productionDateInput.value) {
              const orderDateObj = new Date(orderDate + 'T00:00:00');
              orderDateObj.setDate(orderDateObj.getDate() + 1);
              productionDateInput.value = orderDateObj.toISOString().split('T')[0];
            }
            
            // 如果发货日期为空，根据制作日期设置默认值
            if (!shippingDateInput.value && productionDateInput.value) {
              const productionDateObj = new Date(productionDateInput.value + 'T00:00:00');
              productionDateObj.setDate(productionDateObj.getDate() + 1);
              shippingDateInput.value = productionDateObj.toISOString().split('T')[0];
            }
          }
        }, 300);
      }
      
    });
  }

  const orderFormCard = $('order-form-card');
  if (orderFormCard && !orderFormCard.dataset.costHandlers) {
    orderFormCard.addEventListener('change', (event) => {
      const target = event.target;
      if (target && target.id === 'ofm-shipping-type') {
        handleFoodMakingShippingChange(target.value);
      }
    });
    orderFormCard.addEventListener('click', (event) => {
      const editBtn = event.target && event.target.closest ? event.target.closest('#ofm-price-edit') : null;
      if (editBtn) {
        event.preventDefault();
        openFoodMakingManualPriceEditor();
        return;
      }
      const confirmBtn = event.target && event.target.closest ? event.target.closest('#ofm-price-confirm') : null;
      if (confirmBtn) {
        event.preventDefault();
        confirmFoodMakingManualPrice();
        return;
      }
      const resetBtn = event.target && event.target.closest ? event.target.closest('#ofm-price-reset') : null;
      if (resetBtn) {
        event.preventDefault();
        resetFoodMakingManualPrice();
      }
    });
    orderFormCard.dataset.costHandlers = 'true';
  }
  
  // 订单创建日期现在是只读的，不需要监听变化事件
  // 但我们需要在订单类型变化时，如果是鲜食制作类型，自动设置制作日期和发货日期
  
  // ========== 订单中食谱录入的事件监听器（纯食谱定制类型） ==========
  
  // 原料搜索
  const orderRecipeIngredientSearch = $('or-ingredient-search');
  if (orderRecipeIngredientSearch) {
    orderRecipeIngredientSearch.addEventListener('input', (e) => {
      searchIngredientsForOrderRecipe(e.target.value);
    });
    
    // 点击外部时隐藏搜索结果
    document.addEventListener('click', (e) => {
      if (!orderRecipeIngredientSearch.contains(e.target)) {
        const resultsEl = $('or-ingredient-search-results');
        if (resultsEl && !resultsEl.contains(e.target)) {
          resultsEl.style.display = 'none';
        }
      }
    });
  }
  
  // 添加食材到订单中的食谱
  const addIngredientToOrderRecipeBtn = $('btn-add-ingredient-to-order-recipe');
  if (addIngredientToOrderRecipeBtn) {
    addIngredientToOrderRecipeBtn.addEventListener('click', () => {
      addIngredientToOrderRecipe();
    });
  }
  
  // 食材重量输入框回车事件
  const orderRecipeIngredientWeight = $('or-ingredient-weight');
  if (orderRecipeIngredientWeight) {
    orderRecipeIngredientWeight.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addIngredientToOrderRecipe();
      }
    });
  }
  
  // 总热量变化时重新计算热量密度
  const orderRecipeTotalKcal = $('or-totalKcal');
  if (orderRecipeTotalKcal) {
    orderRecipeTotalKcal.addEventListener('input', () => {
      calculateOrderRecipeKcalDensity();
    });
  }
  // 适用生命阶段、营养参考标准、食谱类型变化时重新生成食谱编号
  ['or-lifeStage', 'or-nutritionStandard', 'or-recipeType'].forEach(fieldId => {
    const fieldEl = $(fieldId);
    if (fieldEl) {
      fieldEl.addEventListener('change', () => {
        autoGenerateOrderRecipeCode();
      });
    }
  });
  
  // 添加制作步骤按钮
  const addCookingStepToOrderRecipeBtn = $('btn-add-cooking-step-to-order-recipe');
  if (addCookingStepToOrderRecipeBtn) {
    addCookingStepToOrderRecipeBtn.addEventListener('click', () => {
      addCookingStepToOrderRecipe();
    });
  }
  
  // ========== 鲜食制作类型的事件监听器 ==========
  
  // 填充鲜食制作的食谱下拉框
  populateFoodMakingRecipeSelect();
  
  // 食谱选择变化时重新计算
  const foodMakingRecipeSelect = $('ofm-recipe-select');
  if (foodMakingRecipeSelect) {
    foodMakingRecipeSelect.addEventListener('change', () => {
      calculateFoodMakingIngredients();
    });
  }
  
  // 制作天数变化时重新计算
  const foodMakingDaysInput = $('ofm-days');
  if (foodMakingDaysInput) {
    foodMakingDaysInput.addEventListener('input', () => {
      calculateFoodMakingIngredients();
    });
    
    foodMakingDaysInput.addEventListener('change', () => {
      calculateFoodMakingIngredients();
    });
  }
  
  // 搜索和筛选
  const searchEl = $('order-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      store.orderPage = 1;
      renderOrdersList();
    });
  }
  
  const statusFilterEl = $('order-status-filter');
  if (statusFilterEl) {
    statusFilterEl.addEventListener('change', () => {
      store.orderPage = 1;
      renderOrdersList();
    });
  }
  
  // 分页
  const prevBtn = $('orders-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (store.orderPage > 1) {
        store.orderPage--;
        renderOrdersList();
      }
    });
  }
  
  const nextBtn = $('orders-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const { totalPages } = paginatedOrders();
      if (store.orderPage < totalPages) {
        store.orderPage++;
        renderOrdersList();
      }
    });
  }
  
  // 表单提交
  const form = $('order-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('订单表单提交事件触发');
      
      const id = $('order-id').value || genId();
      const customerId = $('o-customerId').value;
      const orderType = $('o-orderType').value;
      
      console.log('订单表单数据:', { id, customerId, orderType });
      
      if (!orderType) {
        alert('请选择订单类型');
        return;
      }
      
      if (!customerId) {
        alert('请选择顾客');
        return;
      }
      
      // 对于"纯食谱定制"类型，验证必填字段
      if (orderType === 'recipe_only') {
        const recipeNameField = $('or-name');
        if (recipeNameField && !recipeNameField.value.trim()) {
          alert('请填写食谱名称');
          recipeNameField.focus();
          return;
        }
        const cookingLossField = $('or-cookingLoss');
        if (cookingLossField && !cookingLossField.value) {
          alert('请填写制作损耗');
          cookingLossField.focus();
          return;
        }
      }
      
      // 确保订单创建日期有值
      let orderDate = $('o-orderDate').value;
      if (!orderDate) {
        orderDate = new Date().toISOString().split('T')[0];
        $('o-orderDate').value = orderDate;
      }
      
      // 自动生成订单编号
      autoGenerateOrderNumber();
      const orderNumber = $('o-orderNumber').value.trim();
      
      console.log('订单编号:', orderNumber);
      
      if (!orderNumber) {
        alert('订单编号生成失败，请检查订单类型和日期');
        return;
      }
      
      const record = {
        id,
        orderNumber,
        orderDate: $('o-orderDate').value || new Date().toISOString().split('T')[0],
        status: $('o-status').value || 'pending',
        customerId,
        orderType: orderType,
        parentOrderId: null,
        childOrders: [],
        splitInfo: {
          isSplit: false,
          isAutoSplit: false,
          splitMethod: null
        },
        productionDate: null,
        notes: $('o-notes').value.trim(),
        confirmedAt: null,
        updatedAt: Date.now()
      };
      
      let computedPaymentAmount = 0;
      
      // 根据订单类型保存不同的数据
      if (orderType === 'recipe_only') {
        // 纯食谱定制类型：保存订单中的食谱数据
        if (!currentOrderRecipeIngredients || currentOrderRecipeIngredients.length === 0) {
          alert('请至少添加一个食材');
          return;
        }
        
        // 重新计算总重量
        calculateOrderRecipeTotalWeight();
        
        // 自动生成食谱编号（如果还没有）
        if (!$('or-code').value) {
          autoGenerateOrderRecipeCode();
        }
        
        record.recipeData = {
          name: $('or-name').value.trim(),
          lifeStage: $('or-lifeStage').value || 'adult',
          nutritionStandard: $('or-nutritionStandard').value || 'FEDIAF',
          software: $('or-software').value || 'ADF',
          recipeType: $('or-recipeType').value || 'standard',
          code: $('or-code').value.trim(),
          cookingLoss: parseFloat($('or-cookingLoss').value) || 7,
          sellingPrice: parseFloat($('or-sellingPrice').value) || null,
          protein: parseFloat($('or-protein').value) || null,
          fat: parseFloat($('or-fat').value) || null,
          carb: parseFloat($('or-carb').value) || null,
          fiber: parseFloat($('or-fiber').value) || null,
          ash: parseFloat($('or-ash').value) || null,
          moisture: parseFloat($('or-moisture').value) || null,
          caPratio: $('or-caPratio').value.trim() || null,
          totalKcal: parseFloat($('or-totalKcal').value) || null,
          totalWeight: parseFloat($('or-totalWeight').value) || 0,
          kcalDensity: parseFloat($('or-kcalDensity').value) || null,
          ingredients: currentOrderRecipeIngredients.map(item => ({
            ingredientId: item.ingredientId,
            weight: item.weight,
            unit: item.unit
          })),
          cookingSteps: currentOrderRecipeCookingSteps.filter(step => step && step.trim())
        };
        
        record.orderAmount = null;
      } else if (orderType === 'food_making') {
        // 鲜食制作类型：保存选择的食谱和制作天数
        const recipeId = $('ofm-recipe-select').value;
        const days = parseInt($('ofm-days').value) || 1;
        
        if (!recipeId) {
          alert('请选择食谱');
          return;
        }
        
        if (days <= 0) {
          alert('制作天数必须大于0');
          return;
        }
        
        record.foodMakingData = {
          recipeId: recipeId,
          days: days,
          packaging: currentFoodMakingPackaging || [],
          shippingCost: parseFloat(document.getElementById('ofm-shipping-cost')?.textContent?.replace('¥', '') || document.getElementById('ofm-shipping-cost')?.value || '0') || 0,
          shippingType: (document.getElementById('ofm-shipping-type')?.value) || currentFoodMakingShippingType || 'remote',
          discount: 100,
          paymentAmount: null,
          manualOrderTotalPrice: manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : null,
          autoOrderTotalPrice: latestFoodMakingAutoPrice || null,
          isManualPrice: manualFoodMakingOrderPrice != null
        };
        
        // 保存制作日期和发货日期
        const productionDateInput = document.getElementById('ofm-production-date');
        const shippingDateInput = document.getElementById('ofm-shipping-date');
        if (productionDateInput && productionDateInput.value) {
          record.productionDate = productionDateInput.value;
        }
        if (shippingDateInput && shippingDateInput.value) {
          record.shippingDate = shippingDateInput.value;
        }
        
        // 重新计算确保数据是最新的，并获取总重量
        // 先获取顾客和食谱信息用于计算
        const customer = store.customers.find(c => c.id === customerId);
        const recipe = store.recipes.find(r => r.id === recipeId);
        if (customer && recipe) {
          const estKcal = customer.estKcal || 0;
          const recipeTotalKcal = recipe.totalKcal || 0;
          const ratio = (estKcal > 0 && recipeTotalKcal > 0) ? (estKcal / recipeTotalKcal) : 0;
          const mealsPerDay = customer.mealsPerDay || 1;
          const totalServings = mealsPerDay * days;
          const servingWeight = ratio > 0 ? ((recipe.totalWeight || 0) * ratio / mealsPerDay) : 0;
          const totalWeight = servingWeight * totalServings;
          record.totalWeight = totalWeight;
        } else {
          record.totalWeight = 0;
        }
        const orderTotalPriceEl = document.getElementById('ofm-order-total-price');
        if (orderTotalPriceEl) {
          const totalPriceText = orderTotalPriceEl.textContent.replace(/[^0-9.\-]/g, '').trim();
          const parsedPrice = parseFloat(totalPriceText);
          if (!Number.isNaN(parsedPrice)) {
            computedPaymentAmount = parsedPrice;
          }
        }
      } else if (orderType === 'both') {
        // 食谱定制+鲜食制作类型：后续实现
        alert('食谱定制+鲜食制作类型的功能待实现');
        return;
      }
      if (computedPaymentAmount <= 0) {
        const existingOrder = store.orders.find(o => o.id === id);
        if (existingOrder) {
          const prevPayment = existingOrder.paymentAmount != null ? Number(existingOrder.paymentAmount) : null;
          const prevTotal = existingOrder.totalSellingPrice != null ? Number(existingOrder.totalSellingPrice) : null;
          if (prevPayment && prevPayment > 0) {
            computedPaymentAmount = prevPayment;
          } else if (prevTotal && prevTotal > 0) {
            computedPaymentAmount = prevTotal;
          }
        }
      }
      record.paymentAmount = computedPaymentAmount;
      record.totalSellingPrice = computedPaymentAmount;
      if (record.foodMakingData) {
        record.foodMakingData.paymentAmount = computedPaymentAmount;
      }
      if (record.foodMakingData) {
        record.foodMakingData.paymentAmount = computedPaymentAmount;
      }
      
      const existsIdx = store.orders.findIndex(x => x.id === id);
      if (existsIdx >= 0) {
        record.createdAt = store.orders[existsIdx].createdAt;
        store.orders.splice(existsIdx, 1, record);
      } else {
        record.createdAt = Date.now();
        store.orders.unshift(record);
      }
      
      saveApp();
      const card = $('order-form-card');
      if (card) card.style.display = 'none';
      renderOrdersList();
    });
  }
  
  // 生成报价单按钮
  const generateQuotationBtn = $('btn-generate-quotation');
  if (generateQuotationBtn) {
    generateQuotationBtn.addEventListener('click', () => {
      // TODO: 实现报价单生成功能
      alert('报价单生成功能待实现');
    });
  }
  
  // 初始渲染
  renderOrdersList();
}

// 更新认证 UI
function updateAuthUI() {
  const statusEl = $('auth-status');
  const loginBtn = $('btn-open-login');
  const logoutBtn = $('btn-logout');
  
  if (!statusEl || !loginBtn || !logoutBtn) {
    console.warn('认证UI元素不存在，请检查HTML结构');
    return;
  }
  
  if (backendState.token && backendState.user) {
    const roleMap = { admin: '管理员', employee: '员工', customer: '顾客' };
    statusEl.textContent = `已登录:${roleMap[backendState.user.role] || backendState.user.role}`;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-flex';
    
    // 如果当前在品种管理视图，重新加载数据
    const breedsView = $('view-breeds');
    if (breedsView && breedsView.style.display !== 'none') {
      setTimeout(async () => {
        await loadBreeds();
        await loadBreedCategories();
        renderBreedsList();
      }, 100);
    }
    return;
  }
  
  // 未登录状态
  statusEl.textContent = '未登录';
  loginBtn.style.display = 'inline-flex';
  logoutBtn.style.display = 'none';
}

// 品种管理状态
let breedsState = {
  breeds: [],
  categories: [],
  page: 1,
  pageSize: 10,  // 每页显示10条
  total: 0
};

// 加载品种列表
async function loadBreeds() {
  if (!backendState.token) {
    console.warn('未登录，无法加载品种数据');
    breedsState.breeds = [];
    breedsState.total = 0;
    renderBreedsList(); // 渲染空列表
    return;
  }
  
  try {
    const params = new URLSearchParams({
      page: breedsState.page,
      pageSize: breedsState.pageSize
    });
    
    const search = $('breed-search')?.value.trim();
    if (search) params.append('search', search);
    
    const category = $('breed-category-filter')?.value;
    if (category) params.append('category', category);
    
    const sizeCategory = $('breed-size-filter')?.value;
    if (sizeCategory) params.append('sizeCategory', sizeCategory);
    
    const response = await backendRequest(`/api/v1/breeds?${params.toString()}`);
    
    // backendRequest 已经自动解包了 {success: true, data: {...}} 格式
    // 所以 response 可能是 {items: [...], total: X} 或直接是数组
    let breedsArray = [];
    let total = 0;
    
    if (response && typeof response === 'object') {
      if (Array.isArray(response.items)) {
        // 新格式：包含分页信息
        breedsArray = response.items;
        total = response.total || 0;
      } else if (Array.isArray(response)) {
        // 如果直接是数组（兼容处理）
        breedsArray = response;
        total = breedsArray.length;
      } else if (response.data && Array.isArray(response.data.items)) {
        // 备用：如果 backendRequest 没有解包（不应该发生）
        breedsArray = response.data.items;
        total = response.data.total || 0;
      } else if (Array.isArray(response.data)) {
        breedsArray = response.data;
        total = breedsArray.length;
      } else {
        console.warn('无法解析品种数据格式:', response);
        breedsArray = [];
        total = 0;
      }
    } else if (Array.isArray(response)) {
      breedsArray = response;
      total = breedsArray.length;
    } else {
      console.warn('无法解析品种数据格式:', response);
      breedsArray = [];
      total = 0;
    }
    
    breedsState.breeds = breedsArray;
    breedsState.total = total;
  } catch (error) {
    console.error('Load breeds failed:', error);
    breedsState.breeds = [];
    breedsState.total = 0;
  }
}

// 加载品种分类
async function loadBreedCategories() {
  if (!backendState.token) return;
  
  try {
    const response = await backendRequest('/api/v1/breeds/categories');
    breedsState.categories = Array.isArray(response?.data) ? response.data : [];
    
    const filterEl = $('breed-category-filter');
    if (filterEl) {
      const currentValue = filterEl.value;
      filterEl.innerHTML = '<option value="">全部分类</option>';
      breedsState.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category;
        option.textContent = cat.category;
        filterEl.appendChild(option);
      });
      if (currentValue) filterEl.value = currentValue;
    }
  } catch (error) {
    console.error('Load breed categories failed:', error);
    breedsState.categories = [];
  }
}

// 渲染品种列表
function renderBreedsList() {
  const listEl = $('breeds-list');
  if (!listEl) return;
  
  if (breedsState.breeds.length === 0) {
    listEl.innerHTML = '<div class="list-empty">暂无品种数据</div>';
    const totalEl = $('breeds-total');
    if (totalEl) totalEl.textContent = '共 0 条';
    const pageInfoEl = $('breeds-pageinfo');
    if (pageInfoEl) pageInfoEl.textContent = '';
    return;
  }
  
  const sizeCategoryMap = {
    small: '小型',
    medium: '中型',
    large: '大型',
    xlarge: '超大型'
  };
  
  listEl.innerHTML = breedsState.breeds.map(breed => {
    const weightRange = breed.weightMin && breed.weightMax
      ? `${breed.weightMin}-${breed.weightMax}`
      : breed.weightMin
      ? `≥${breed.weightMin}`
      : breed.weightMax
      ? `≤${breed.weightMax}`
      : '-';
    
    return `
      <div class="list-item" style="display: grid; grid-template-columns: 1.5fr 1fr 0.8fr 1fr 1fr 1.2fr; gap: 12px; align-items: center;">
        <div>${escapeHtml(breed.category || '-')}</div>
        <div>${escapeHtml(breed.name || '-')}</div>
        <div>${sizeCategoryMap[breed.sizeCategory] || '-'}</div>
        <div>${weightRange}</div>
        <div>${breed.maturityMonths ? breed.maturityMonths + '个月' : '-'}</div>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btn small" onclick="editBreed(${breed.id})">编辑</button>
          <button class="btn small ghost" onclick="deleteBreed(${breed.id})">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  const totalEl = $('breeds-total');
  if (totalEl) totalEl.textContent = `共 ${breedsState.total} 条`;
  
  const totalPages = Math.ceil(breedsState.total / breedsState.pageSize);
  const pageInfoEl = $('breeds-pageinfo');
  if (pageInfoEl) pageInfoEl.textContent = `第 ${breedsState.page} / ${totalPages} 页`;
}

// 编辑品种
async function editBreed(breedId) {
  try {
    const breed = await backendRequest(`/api/v1/breeds/${breedId}`);
    if (!breed || !breed.data) {
      alert('未找到该品种信息');
      return;
    }
    
    const breedData = breed.data;
    $('breed-id').value = breedData.id;
    $('breed-form-title').textContent = '编辑品种';
    $('b-category').value = breedData.category || '';
    $('b-name').value = breedData.name || '';
    $('b-sizeCategory').value = breedData.sizeCategory || '';
    $('b-weightMin').value = breedData.weightMin || '';
    $('b-weightMax').value = breedData.weightMax || '';
    $('b-maturityMonths').value = breedData.maturityMonths || '';
    
    const formCard = $('breed-form-card');
    if (formCard) {
      formCard.style.display = 'block';
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    console.error('Load breed failed:', error);
    alert('加载品种信息失败：' + error.message);
  }
}

// 删除品种
async function deleteBreed(breedId) {
  if (!confirm('确定要删除这个品种吗？')) return;
  
  try {
    await backendRequest(`/api/v1/breeds/${breedId}`, { method: 'DELETE' });
    await loadBreeds();
    renderBreedsList();
  } catch (error) {
    console.error('Delete breed failed:', error);
    alert('删除失败：' + error.message);
  }
}

// 设置品种管理模块
function setupBreedsModule() {
  // 搜索和筛选
  const searchEl = $('breed-search');
  if (searchEl) {
    searchEl.addEventListener('input', async () => {
      breedsState.page = 1;
      await loadBreeds();
      renderBreedsList();
    });
  }
  
  const categoryFilterEl = $('breed-category-filter');
  if (categoryFilterEl) {
    categoryFilterEl.addEventListener('change', async () => {
      breedsState.page = 1;
      await loadBreeds();
      renderBreedsList();
    });
  }
  
  const sizeFilterEl = $('breed-size-filter');
  if (sizeFilterEl) {
    sizeFilterEl.addEventListener('change', async () => {
      breedsState.page = 1;
      await loadBreeds();
      renderBreedsList();
    });
  }
  
  // 新增按钮
  const newBtn = $('btn-new-breed');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      $('breed-id').value = '';
      $('breed-form-title').textContent = '新增品种';
      $('breed-form').reset();
      const formCard = $('breed-form-card');
      if (formCard) {
        formCard.style.display = 'block';
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
  
  // 取消按钮
  const cancelBtn = $('btn-cancel-breed');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const formCard = $('breed-form-card');
      if (formCard) formCard.style.display = 'none';
    });
  }
  
  // 表单提交
  const formEl = $('breed-form');
  if (formEl) {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const breedId = $('breed-id').value;
      const payload = {
        category: $('b-category').value.trim(),
        name: $('b-name').value.trim(),
        sizeCategory: $('b-sizeCategory').value,
        weightMin: $('b-weightMin').value ? parseFloat($('b-weightMin').value) : null,
        weightMax: $('b-weightMax').value ? parseFloat($('b-weightMax').value) : null,
        maturityMonths: $('b-maturityMonths').value ? parseInt($('b-maturityMonths').value, 10) : null
      };
      
      try {
        if (breedId) {
          await backendRequest(`/api/v1/breeds/${breedId}`, {
            method: 'PUT',
            body: payload
          });
        } else {
          await backendRequest('/api/v1/breeds', {
            method: 'POST',
            body: payload
          });
        }
        
        const formCard = $('breed-form-card');
        if (formCard) formCard.style.display = 'none';
        
        await loadBreeds();
        renderBreedsList();
      } catch (error) {
        console.error('Save breed failed:', error);
        alert('保存失败：' + error.message);
      }
    });
  }
  
  // 分页
  const prevBtn = $('breeds-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', async () => {
      if (breedsState.page > 1) {
        breedsState.page--;
        await loadBreeds();
        renderBreedsList();
      }
    });
  }
  
  const nextBtn = $('breeds-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      const totalPages = Math.ceil(breedsState.total / breedsState.pageSize);
      if (breedsState.page < totalPages) {
        breedsState.page++;
        await loadBreeds();
        renderBreedsList();
      }
    });
  }
  
  // 视图切换时加载数据
  const breedsView = $('view-breeds');
  if (breedsView) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const isVisible = breedsView.style.display !== 'none';
          if (isVisible && backendState.token) {
            setTimeout(async () => {
              await loadBreeds();
              await loadBreedCategories();
              renderBreedsList();
            }, 100);
          }
        }
      });
    });
    observer.observe(breedsView, { attributes: true, attributeFilter: ['style'] });
  }
}

// 暴露给全局
window.editBreed = editBreed;
window.deleteBreed = deleteBreed;

function setupSettingsModule() {
  // 导出数据
  const exportBtn = $('btn-export-json');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = {
        customers: store.customers,
        ingredients: store.ingredients,
        recipes: store.recipes,
        orders: store.orders,
        exportedAt: new Date().toISOString()
      };
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pet-food-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('数据已导出！');
    });
  }
  
  // 导入数据
  const importInput = $('import-json');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.customers || data.ingredients) {
            if (confirm('导入数据将覆盖现有数据，是否继续？\n注意：导入前会自动备份当前数据。')) {
              // 导入前先备份当前数据
              const currentData = {
                customers: store.customers,
                ingredients: store.ingredients,
                recipes: store.recipes,
                orders: store.orders
              };
              createBackup(currentData);
              
              if (data.customers && Array.isArray(data.customers)) {
                store.customers = data.customers;
              }
              if (data.ingredients && Array.isArray(data.ingredients)) {
                store.ingredients = data.ingredients;
              }
              if (data.recipes && Array.isArray(data.recipes)) {
                store.recipes = data.recipes;
              }
              if (data.orders && Array.isArray(data.orders)) {
                store.orders = data.orders;
              }
              saveAppWithoutBackup(); // 导入时不创建备份（因为已经在上面备份了）
              renderCustomersList();
              renderIngredientsList();
              renderRecipesList();
              renderBackupsList(); // 刷新备份列表
              alert('导入成功！已自动备份原数据。');
            }
          } else {
            alert('文件格式不正确');
          }
        } catch (error) {
          alert('导入失败：' + error.message);
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }
  
  // 清除缓存
  const clearCacheBtn = $('btn-clear-cache');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      if (confirm('确定要清除所有缓存吗？这将不会删除localStorage中的数据。')) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          alert('缓存已清除！');
        } catch (error) {
          alert('清除缓存失败：' + error.message);
        }
      }
    });
  }
  
  // 取消注册Service Worker
  const unregisterBtn = $('btn-unregister-sw');
  if (unregisterBtn) {
    unregisterBtn.addEventListener('click', async () => {
      if (confirm('确定要取消注册Service Worker吗？这将清除所有缓存。')) {
        try {
          if (!navigator.serviceWorker) {
            alert('当前浏览器不支持 Service Worker');
            return;
          }
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          alert('Service Worker已取消注册，请刷新页面！');
          setTimeout(() => location.reload(), 1000);
        } catch (error) {
          alert('操作失败：' + error.message);
        }
      }
    });
  }
  
  // 更新调试信息
  const updateDebugInfo = () => {
    const debugEl = $('debug-info');
    if (debugEl) {
      const info = {
        'localStorage键': Object.keys(localStorage).filter(k => k.startsWith('pff-')).join(', ') || '无',
        '顾客数量': store.customers.length,
        '原料数量': store.ingredients.length,
        '食谱数量': store.recipes.length,
        '订单数量': store.orders.length,
        'Service Worker': (navigator.serviceWorker && navigator.serviceWorker.controller) ? '已注册' : '未注册'
      };
      debugEl.innerHTML = Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('<br>');
    }
  };
  
  // 定期更新调试信息
  setInterval(updateDebugInfo, 1000);
  updateDebugInfo();
  
  // 初始渲染备份列表
  renderBackupsList();
}
function init() {
  try {
    console.log('[init] 开始初始化应用...');
    console.log('[init] document.readyState:', document.readyState);
    console.log('[init] DOM是否已加载:', document.body !== null);
    console.log('[init] 检查localStorage中的键:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pff-')) {
      console.log('- ' + key + ':', localStorage.getItem(key) ? '有数据' : '无数据');
    }
  }
  
  loadApp();
  
  loadBackendAuth();
  console.log('初始化后 - 顾客数据:', store.customers.length, '条');
  console.log('初始化后 - 原料数据:', store.ingredients.length, '条');
  console.log('初始化后 - 食谱数据:', store.recipes.length, '条');
  console.log('初始化后 - 订单数据:', store.orders.length, '条');
  
  setupNav();
  setupPWA();
  setupCustomersModule();
  
  // 延迟初始化需要特定视图元素的模块
  try {
    setupIngredientsModule();
  } catch (error) {
    console.error('[init] setupIngredientsModule 失败:', error);
  }
  
  try {
    setupRecipesModule();
  } catch (error) {
    console.error('[init] setupRecipesModule 失败:', error);
  }
  
  try {
    setupOrdersModule();
  } catch (error) {
    console.error('[init] setupOrdersModule 失败:', error);
  }
  
  try {
    setupBreedsModule();
  } catch (error) {
    console.error('[init] setupBreedsModule 失败:', error);
  }
  
  try {
    setupSettingsModule();
  } catch (error) {
    console.error('[init] setupSettingsModule 失败:', error);
  }
  
  updateAuthUI();
  
  // 只在 customers 视图存在时才渲染
  const customersList = $('customers-list');
  if (customersList) {
    try {
      renderCustomersList();
    } catch (error) {
      console.error('[init] renderCustomersList 失败:', error);
    }
  }
  
  // 恢复上次的视图，如果没有则默认显示customers
  let savedView = 'customers';
  try {
    const saved = localStorage.getItem('pff-current-view');
    if (saved && ['customers', 'recipes', 'inventory', 'orders', 'settings', 'breeds', 'users'].includes(saved)) {
      savedView = saved;
    }
  } catch (e) {
    console.warn('读取保存的视图失败:', e);
  }
  switchView(savedView);
  
  // 登录按钮
  const loginBtn = $('btn-open-login');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const email = prompt('请输入邮箱:');
      if (!email) return;
      const password = prompt('请输入密码:');
      if (!password) return;
      backendLogin(email, password).then(() => {
        alert('登录成功！');
      }).catch(err => {
        alert('登录失败：' + err.message);
      });
    });
  }
  
  // 退出按钮
  const logoutBtn = $('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('确定要退出登录吗？')) {
        clearBackendAuth();
      }
    });
  }
  
  console.log('[init] 初始化完成');
  } catch (error) {
    console.error('[init] 初始化失败:', error);
    console.error('[init] 错误堆栈:', error.stack);
    alert('应用初始化失败，请刷新页面重试。错误信息：' + error.message);
  }
}

// 地址管理对话框
async function openAddressManagementDialog(userId) {
  if (!userId) {
    alert('用户ID无效');
    return;
  }
  
  // 创建简单的地址管理对话框
  const dialog = document.createElement('div');
  dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
  
  const content = document.createElement('div');
  content.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;';
  
  content.innerHTML = `
    <h3 style="margin-top: 0;">地址管理</h3>
    <div id="address-list" style="margin: 10px 0;">
      <p>加载中...</p>
    </div>
    <div style="margin-top: 10px;">
      <button id="address-add-btn" class="btn">新增地址</button>
      <button id="address-close-btn" class="btn" style="margin-left: 10px;">关闭</button>
    </div>
  `;
  
  dialog.appendChild(content);
  document.body.appendChild(dialog);
  
  // 加载地址列表
  const loadAddresses = async () => {
    const listEl = content.querySelector('#address-list');
    try {
      // 检查是否已登录
      if (!backendState.token) {
        listEl.innerHTML = '<p style="color: red;">请先登录管理员账号</p>';
        return;
      }
      
      // 使用管理员API获取地址列表
      console.log(`加载用户 ${userId} 的地址列表，API路径: /api/v1/addresses/customer/${userId}`);
      console.log(`当前登录状态:`, backendState.token ? '已登录' : '未登录');
      console.log(`当前用户角色:`, backendState.user?.role || '未知');
      
      const response = await backendRequest(`/api/v1/addresses/customer/${userId}`, {
        method: 'GET'
      });
      console.log(`地址API响应:`, response, '类型:', typeof response);
      
      // 处理返回格式：可能是数组或 {items: []}
      let addresses = [];
      if (Array.isArray(response)) {
        addresses = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.items)) {
          addresses = response.items;
        } else if (Array.isArray(response.data)) {
          addresses = response.data;
        } else if (response.data && Array.isArray(response.data.items)) {
          addresses = response.data.items;
        }
      }
      
      if (!addresses || addresses.length === 0) {
        listEl.innerHTML = '<p style="color: #999;">该用户暂无收货地址</p>';
        return;
      }
      
      console.log(`找到 ${addresses.length} 个地址`);
      
      // 渲染地址列表
      listEl.innerHTML = addresses.map((addr, index) => `
        <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px; ${addr.isDefault ? 'border-color: #4CAF50; background: #f0f8f0;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1;">
              ${addr.isDefault ? '<span style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-right: 8px;">默认</span>' : ''}
              <strong>${addr.contactName || '未填写'}</strong> ${addr.contactPhone || ''}
              <div style="margin-top: 5px; color: #666; font-size: 14px;">
                ${addr.region || ''} ${addr.detail || ''}
              </div>
            </div>
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
              ${!addr.isDefault ? `<button class="btn small" data-set-default-addr="${addr.id}" style="font-size: 12px; padding: 4px 8px; background: #4CAF50; color: white;">设为默认</button>` : ''}
              <button class="btn small" data-edit-addr="${addr.id}" style="font-size: 12px; padding: 4px 8px;">编辑</button>
              <button class="btn small" data-delete-addr="${addr.id}" style="font-size: 12px; padding: 4px 8px; background: #f44336;">删除</button>
            </div>
          </div>
        </div>
      `).join('');
      
      // 绑定设为默认地址按钮事件
      listEl.querySelectorAll('[data-set-default-addr]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const addrId = Number(btn.dataset.setDefaultAddr);
          try {
            // 先获取当前地址信息
            const address = addresses.find(a => a.id === addrId);
            if (!address) {
              alert('地址不存在');
              return;
            }
            
            // 更新为默认地址
            await backendRequest(`/api/v1/addresses/${addrId}`, {
              method: 'PUT',
              body: {
                ...address,
                isDefault: true
              }
            });
            await loadAddresses();
          } catch (error) {
            alert('设置默认地址失败: ' + (error.message || '未知错误'));
          }
        });
      });
      
      // 绑定编辑和删除按钮事件
      listEl.querySelectorAll('[data-edit-addr]').forEach(btn => {
        btn.addEventListener('click', () => {
          const addrId = Number(btn.dataset.editAddr);
          const address = addresses.find(a => a.id === addrId);
          if (address) {
            openEditAddressDialog(address, userId, loadAddresses);
          }
        });
      });
      
      listEl.querySelectorAll('[data-delete-addr]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const addrId = Number(btn.dataset.deleteAddr);
          if (confirm('确定要删除这个地址吗？')) {
            try {
              await backendRequest(`/api/v1/addresses/${addrId}`, {
                method: 'DELETE'
              });
              await loadAddresses();
            } catch (error) {
              alert('删除失败: ' + (error.message || '未知错误'));
            }
          }
        });
      });
    } catch (error) {
      console.error('加载地址失败:', error);
      let errorMsg = error.message || '未知错误';
      // 如果是权限错误，提供更友好的提示
      if (errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('权限') || errorMsg.includes('Insufficient')) {
        errorMsg = '权限不足，请确保已使用管理员账号登录。如果已登录，请检查后端路由配置是否正确。';
      } else if (errorMsg.includes('401') || errorMsg.includes('Authentication')) {
        errorMsg = '未登录或登录已过期，请重新登录管理员账号。';
      } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        errorMsg = 'API端点不存在，请检查后端路由配置。';
      }
      listEl.innerHTML = `<p style="color: red;">加载地址失败: ${errorMsg}</p><p style="color: #999; font-size: 12px; margin-top: 10px;">提示：请检查浏览器控制台的详细错误信息。</p>`;
    }
  };
  
  await loadAddresses();
  
  // 关闭按钮
  content.querySelector('#address-close-btn').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  // 新增地址按钮
  content.querySelector('#address-add-btn').addEventListener('click', () => {
    openEditAddressDialog(null, userId, loadAddresses);
  });
  
  // 编辑/新增地址对话框
  function openEditAddressDialog(address, customerId, onSuccess) {
    const editDialog = document.createElement('div');
    editDialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;';
    
    const editContent = document.createElement('div');
    editContent.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;';
    
    const isEdit = !!address;
    editContent.innerHTML = `
      <h3 style="margin-top: 0;">${isEdit ? '编辑' : '新增'}地址</h3>
      <form id="address-form" style="margin-top: 15px;">
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">联系人姓名</label>
          <input type="text" id="addr-contact-name" value="${address?.contactName || ''}" required style="width: 100%; padding: 8px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">联系电话</label>
          <input type="tel" id="addr-contact-phone" value="${address?.contactPhone || ''}" required style="width: 100%; padding: 8px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">地区</label>
          <div style="display: flex; gap: 8px;">
            <select id="addr-province" style="flex: 1; padding: 8px; box-sizing: border-box;">
              <option value="">请选择省/市/自治区</option>
            </select>
            <select id="addr-city" style="flex: 1; padding: 8px; box-sizing: border-box;" disabled>
              <option value="">请选择市</option>
            </select>
            <select id="addr-district" style="flex: 1; padding: 8px; box-sizing: border-box;" disabled>
              <option value="">请选择区/县</option>
            </select>
          </div>
          <input type="hidden" id="addr-region" />
        </div>
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">详细地址</label>
          <textarea id="addr-detail" rows="3" required style="width: 100%; padding: 8px; box-sizing: border-box;">${address?.detail || ''}</textarea>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: flex; align-items: center; justify-content: space-between;">
            <span>设为默认地址</span>
            <label style="position: relative; display: inline-block; width: 50px; height: 26px; margin: 0; cursor: pointer;">
              <input type="checkbox" id="addr-is-default" ${address?.isDefault ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;" />
              <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; border-radius: 26px; transition: 0.3s;">
                <span style="position: absolute; content: ''; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
              </span>
            </label>
          </label>
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="submit" class="btn" style="flex: 1;">保存</button>
          <button type="button" class="btn" id="addr-cancel-btn" style="flex: 1; background: #999;">取消</button>
        </div>
      </form>
    `;
    
    editDialog.appendChild(editContent);
    document.body.appendChild(editDialog);
    
    // 初始化省市区三级联动
    const provinceSelect = editContent.querySelector('#addr-province');
    const citySelect = editContent.querySelector('#addr-city');
    const districtSelect = editContent.querySelector('#addr-district');
    const regionHidden = editContent.querySelector('#addr-region');
    
    // 检查元素是否存在
    if (!provinceSelect || !citySelect || !districtSelect || !regionHidden) {
      console.error('省市区选择器元素未找到:', { 
        provinceSelect: !!provinceSelect, 
        citySelect: !!citySelect, 
        districtSelect: !!districtSelect, 
        regionHidden: !!regionHidden 
      });
      return;
    }
    
    // 更新region值（格式：省 市 区，空格分隔，与小程序端兼容）
    // 直辖市格式：省 区（不包含市）
    const municipalities = ['北京市', '天津市', '上海市', '重庆市'];
    const updateRegionValue = () => {
      const province = provinceSelect.value;
      const city = citySelect.value;
      const district = districtSelect.value;
      const parts = [];
      if (province) parts.push(province);
      // 直辖市不包含城市部分
      if (city && !municipalities.includes(province)) {
        parts.push(city);
      }
      if (district) parts.push(district);
      regionHidden.value = parts.join(' ');
      console.log('更新region值:', regionHidden.value, { province, city, district, isMunicipality: municipalities.includes(province) });
    };
    
    // 加载省市区数据并初始化
    (async () => {
      try {
        console.log('开始加载省市区数据...');
        const regionsData = await loadChinaRegions();
        console.log('省市区数据加载完成，数据:', regionsData);
        
        if (!regionsData || Object.keys(regionsData).length === 0) {
          console.error('省市区数据为空');
          return;
        }
        
        // 初始化省份下拉框
        provinceSelect.innerHTML = '<option value="">请选择省/市/自治区</option>';
        const provinces = Object.keys(regionsData).sort();
        provinces.forEach(province => {
          const option = document.createElement('option');
          option.value = province;
          option.textContent = province;
          provinceSelect.appendChild(option);
        });
        console.log('省份下拉框初始化完成，共', provinces.length, '个省份');
        console.log('示例省份数据:', provinces.slice(0, 3).map(p => ({ 
          province: p, 
          cities: Object.keys(regionsData[p] || {}) 
        })));
        
        // 省份变化时更新市下拉框
        const handleProvinceChange = () => {
          const province = provinceSelect.value;
          console.log('省份选择变化:', province);
          const isMunicipality = municipalities.includes(province);
          
          // 重置下拉框
          citySelect.innerHTML = '<option value="">请选择市</option>';
          districtSelect.innerHTML = '<option value="">请选择区/县</option>';
          districtSelect.disabled = true;
          
          if (province && regionsData[province]) {
            if (isMunicipality) {
              // 直辖市：隐藏市级选择，直接显示区级选择
              citySelect.style.display = 'none';
              citySelect.disabled = true;
              citySelect.value = ''; // 清空城市选择
              
              // 直辖市的数据结构：{ '北京市': [区列表] } 或 { '市辖区': [区列表] } 或 { '重庆市': [区列表] }
              const cityKeys = Object.keys(regionsData[province]);
              let districts = [];
              
              console.log(`直辖市 ${province} 的城市键:`, cityKeys);
              
              // 尝试获取区县数据
              if (cityKeys.length > 0) {
                // 优先查找与省份同名的城市键（如"北京市"、"重庆市"）
                let targetCityKey = cityKeys.find(key => key === province || key === province.replace('市', '') || key === province.replace('省', ''));
                
                // 如果没找到，尝试查找"市辖区"或第一个非"其他市"的键
                if (!targetCityKey) {
                  targetCityKey = cityKeys.find(key => key === '市辖区' || key.includes('市') || key !== '其他市');
                }
                
                // 如果还是没找到，使用第一个键
                if (!targetCityKey && cityKeys.length > 0) {
                  targetCityKey = cityKeys[0];
                }
                
                console.log(`直辖市 ${province} 使用的城市键:`, targetCityKey);
                
                if (targetCityKey) {
                  districts = regionsData[province][targetCityKey] || [];
                  
                  // 如果第一个键没有数据，尝试合并所有城市键的区县数据
                  if (districts.length === 0 && cityKeys.length > 1) {
                    console.log('第一个城市键没有数据，尝试合并所有城市键的区县数据');
                    cityKeys.forEach(key => {
                      const cityDistricts = regionsData[province][key];
                      if (Array.isArray(cityDistricts) && cityDistricts.length > 0) {
                        districts = districts.concat(cityDistricts);
                      }
                    });
                    // 去重
                    districts = [...new Set(districts)];
                  }
                }
              }
              
              console.log(`直辖市 ${province} 的区县数据:`, districts.length, '个区县', districts.slice(0, 10));
              
              if (districts.length > 0) {
                districtSelect.disabled = false;
                districts.sort().forEach(district => {
                  const option = document.createElement('option');
                  option.value = district;
                  option.textContent = district;
                  districtSelect.appendChild(option);
                });
                console.log(`✓ 直辖市区县列表已加载: ${province} 有 ${districts.length} 个区县`);
              } else {
                console.warn(`⚠️ 直辖市 ${province} 没有找到区县数据，城市键:`, cityKeys, '数据结构:', regionsData[province]);
              }
            } else {
              // 非直辖市：显示市级选择
              citySelect.style.display = 'block';
              citySelect.disabled = false;
              const cities = Object.keys(regionsData[province]).sort();
              console.log('加载城市列表:', cities, '共', cities.length, '个城市');
              if (cities.length > 0) {
                cities.forEach(city => {
                  const option = document.createElement('option');
                  option.value = city;
                  option.textContent = city;
                  citySelect.appendChild(option);
                });
                console.log('城市下拉框已填充，当前状态:', { 
                  disabled: citySelect.disabled, 
                  optionsCount: citySelect.options.length 
                });
              } else {
                console.warn('该省份没有城市数据');
              }
            }
          } else {
            citySelect.style.display = 'block';
            citySelect.disabled = true;
            console.warn('未找到省份对应的城市数据:', province, '可用省份:', Object.keys(regionsData));
          }
          updateRegionValue();
        };
        provinceSelect.addEventListener('change', handleProvinceChange);
        
        // 市变化时更新区下拉框
        const handleCityChange = () => {
          const province = provinceSelect.value;
          const city = citySelect.value;
          console.log('城市选择变化:', province, city);
          districtSelect.innerHTML = '<option value="">请选择区/县</option>';
          
          if (province && city && regionsData[province] && regionsData[province][city]) {
            districtSelect.disabled = false;
            const districts = regionsData[province][city].sort();
            console.log('加载区县列表:', districts, '共', districts.length, '个区县');
            if (districts.length > 0) {
              districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
              });
              console.log('区县下拉框已填充，当前状态:', { 
                disabled: districtSelect.disabled, 
                optionsCount: districtSelect.options.length 
              });
            } else {
              console.warn('该城市没有区县数据');
            }
          } else {
            districtSelect.disabled = true;
            console.warn('未找到城市对应的区县数据:', { province, city, hasProvince: !!regionsData[province], hasCity: !!(regionsData[province] && regionsData[province][city]) });
          }
          updateRegionValue();
        };
        citySelect.addEventListener('change', handleCityChange);
        
        // 区变化时更新隐藏的region字段
        districtSelect.addEventListener('change', () => {
          console.log('区县选择变化:', districtSelect.value);
          updateRegionValue();
        });
        
        // 如果编辑现有地址，解析region并回填
        if (address?.region) {
          const regionParts = address.region.split(' ').filter(p => p.trim());
          if (regionParts.length >= 1) {
            // 尝试匹配省份
            const provinceName = regionParts[0];
            const isMunicipality = municipalities.includes(provinceName);
            
            if (regionsData[provinceName]) {
              provinceSelect.value = provinceName;
              provinceSelect.dispatchEvent(new Event('change'));
              
              // 等待省份变化处理完成
              setTimeout(() => {
                if (isMunicipality) {
                  // 直辖市：直接匹配区县
                  if (regionParts.length >= 2) {
                    const districtName = regionParts[1];
                    const cityKeys = Object.keys(regionsData[provinceName]);
                    if (cityKeys.length > 0) {
                      const firstCityKey = cityKeys[0];
                      const districts = regionsData[provinceName][firstCityKey] || [];
                      if (districts.includes(districtName)) {
                        districtSelect.value = districtName;
                      } else {
                        // 如果区县不匹配，添加自定义选项
                        const customOption = document.createElement('option');
                        customOption.value = districtName;
                        customOption.textContent = districtName + ' (自定义)';
                        customOption.selected = true;
                        districtSelect.appendChild(customOption);
                      }
                    }
                  }
                  updateRegionValue();
                } else {
                  // 非直辖市：匹配市和区
                  if (regionParts.length >= 2) {
                    const cityName = regionParts[1];
                    if (regionsData[provinceName][cityName]) {
                      citySelect.value = cityName;
                      citySelect.dispatchEvent(new Event('change'));
                      
                      if (regionParts.length >= 3) {
                        setTimeout(() => {
                          const districtName = regionParts[2];
                          const districts = regionsData[provinceName][cityName];
                          if (districts.includes(districtName)) {
                            districtSelect.value = districtName;
                          } else {
                            // 如果区县不匹配，添加自定义选项
                            const customOption = document.createElement('option');
                            customOption.value = districtName;
                            customOption.textContent = districtName + ' (自定义)';
                            customOption.selected = true;
                            districtSelect.appendChild(customOption);
                          }
                          updateRegionValue();
                        }, 100);
                      } else {
                        updateRegionValue();
                      }
                    } else {
                      // 如果市不匹配，添加自定义选项
                      const customOption = document.createElement('option');
                      customOption.value = cityName;
                      customOption.textContent = cityName + ' (自定义)';
                      customOption.selected = true;
                      citySelect.appendChild(customOption);
                      citySelect.dispatchEvent(new Event('change'));
                      updateRegionValue();
                    }
                  } else {
                    updateRegionValue();
                  }
                }
              }, 100);
            } else {
              // 如果省份不匹配，显示原始值
              console.warn('无法匹配省份:', provinceName);
              regionHidden.value = address.region;
            }
          } else {
            // 如果region格式不正确，尝试直接设置
            regionHidden.value = address.region;
          }
        }
      } catch (error) {
        console.error('初始化省市区选择器失败:', error);
        // 如果加载失败，至少设置隐藏字段的值
        if (address?.region) {
          regionHidden.value = address.region;
        }
      }
    })();
    
    // 添加开关按钮的样式和交互
    const toggleCheckbox = editContent.querySelector('#addr-is-default');
    const toggleLabel = toggleCheckbox?.parentElement;
    const toggleSpan = toggleCheckbox?.nextElementSibling;
    if (toggleCheckbox && toggleSpan) {
      const toggleSlider = toggleSpan.querySelector('span');
      
      // 更新开关状态
      const updateToggle = () => {
        if (toggleCheckbox.checked) {
          toggleSpan.style.backgroundColor = '#4CAF50';
          if (toggleSlider) {
            toggleSlider.style.transform = 'translateX(24px)';
          }
        } else {
          toggleSpan.style.backgroundColor = '#ccc';
          if (toggleSlider) {
            toggleSlider.style.transform = 'translateX(0)';
          }
        }
      };
      
      // 初始化状态
      updateToggle();
      
      // 监听变化
      toggleCheckbox.addEventListener('change', updateToggle);
    }
  }
}

// ========== 品牌和采购渠道管理功能 ==========

// 打开品牌管理弹窗
async function openBrandManagement() {
  const card = $('brand-management-card');
  if (!card) return;
  
  card.style.display = 'block';
  await loadAndRenderBrands();
}

// 关闭品牌管理弹窗
function closeBrandManagement() {
  const card = $('brand-management-card');
  if (card) {
    card.style.display = 'none';
  }
}

// 加载并渲染品牌列表
function loadAndRenderBrands() {
  const listEl = $('brand-list-manage');
  const statsEl = $('brand-stats');
  const searchInput = $('brand-search-input');
  
  if (!listEl) return;
  
  const brands = getBrands();
  
  // 应用搜索过滤
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filtered = brands.filter(brand => {
    if (!searchText) return true;
    return brand.toLowerCase().includes(searchText);
  });
  
  // 统计使用情况
  const usageMap = {};
  store.ingredients.forEach(ing => {
    if (ing.brand) {
      usageMap[ing.brand] = (usageMap[ing.brand] || 0) + 1;
    }
  });
  
  // 渲染品牌列表
  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">暂无品牌数据</div>';
  } else {
    listEl.innerHTML = filtered.map(brand => {
      const usageCount = usageMap[brand] || 0;
      const usageText = usageCount > 0 ? `（${usageCount}个原料）` : '';
      return `
        <div class="brand-item-row" data-brand="${escapeHtml(brand)}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:6px; background:white;">
          <div style="flex:1; display:flex; align-items:center; gap:8px;">
            <strong class="brand-name-display" style="display:inline-block; min-width:100px;">${escapeHtml(brand)}</strong>
            <input type="text" class="brand-name-edit" value="${escapeHtml(brand)}" style="display:none; flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:14px;" />
            <span style="color:var(--text-secondary); font-size:12px;">${usageText}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn small" data-edit-brand="${escapeHtml(brand)}" data-save-brand="${escapeHtml(brand)}" style="font-size:12px; padding:4px 12px;">编辑</button>
            <button class="btn small" data-delete-brand="${escapeHtml(brand)}" style="font-size:12px; padding:4px 12px; background:#f44336; color:white;" ${usageCount > 0 ? 'disabled title="该品牌正在使用中，无法删除"' : ''}>删除</button>
          </div>
        </div>
      `;
    }).join('');
    
    // 绑定事件
    listEl.querySelectorAll('[data-edit-brand]').forEach(btn => {
      btn.addEventListener('click', () => {
        const brand = btn.dataset.editBrand;
        const row = listEl.querySelector(`[data-brand="${escapeHtml(brand)}"]`);
        if (row) {
          const displayEl = row.querySelector('.brand-name-display');
          const editEl = row.querySelector('.brand-name-edit');
          if (displayEl && editEl) {
            displayEl.style.display = 'none';
            editEl.style.display = 'block';
            editEl.focus();
            editEl.select();
            btn.textContent = '保存';
            btn.dataset.saving = 'true';
          }
        }
      });
    });
    
    listEl.querySelectorAll('[data-save-brand]').forEach(btn => {
      if (btn.dataset.saving === 'true') {
        btn.addEventListener('click', () => {
          const oldBrand = btn.dataset.saveBrand;
          const row = listEl.querySelector(`[data-brand="${escapeHtml(oldBrand)}"]`);
          if (row) {
            const editEl = row.querySelector('.brand-name-edit');
            const newBrand = editEl ? editEl.value.trim() : '';
            if (!newBrand) {
              alert('品牌名称不能为空');
              return;
            }
            if (newBrand !== oldBrand && brands.includes(newBrand)) {
              alert('该品牌已存在');
              return;
            }
            // 更新品牌列表
            const index = brands.indexOf(oldBrand);
            if (index >= 0) {
              brands[index] = newBrand;
              saveBrands(brands);
              // 更新原料中的品牌
              store.ingredients.forEach(ing => {
                if (ing.brand === oldBrand) {
                  ing.brand = newBrand;
                }
              });
              populateBrandSelect();
              loadAndRenderBrands();
            }
          }
        });
      }
    });
    
    listEl.querySelectorAll('[data-delete-brand]').forEach(btn => {
      btn.addEventListener('click', () => {
        const brand = btn.dataset.deleteBrand;
        const usageCount = usageMap[brand] || 0;
        if (usageCount > 0) {
          alert('该品牌正在使用中，无法删除');
          return;
        }
        if (confirm(`确定要删除品牌"${brand}"吗？`)) {
          const index = brands.indexOf(brand);
          if (index >= 0) {
            brands.splice(index, 1);
            saveBrands(brands);
            populateBrandSelect();
            loadAndRenderBrands();
          }
        }
      });
    });
  }
  
  // 更新统计信息
  if (statsEl) {
    const totalBrands = brands.length;
    const usedBrands = Object.keys(usageMap).length;
    statsEl.textContent = `共 ${totalBrands} 个品牌，其中 ${usedBrands} 个正在使用`;
  }
}

// 添加品牌
function addBrand() {
  const inputEl = $('brand-add-input');
  if (!inputEl) return;
  
  const newBrand = inputEl.value.trim();
  if (!newBrand) {
    alert('品牌名称不能为空');
    return;
  }
  
  const brands = getBrands();
  if (brands.includes(newBrand)) {
    alert('该品牌已存在');
    return;
  }
  
  brands.push(newBrand);
  brands.sort();
  saveBrands(brands);
  populateBrandSelect();
  loadAndRenderBrands();
  
  // 清空输入框
  inputEl.value = '';
  inputEl.focus();
}

// ========== 单位管理功能 ==========

// 打开单位管理弹窗
async function openUnitManagement() {
  const card = $('unit-management-card');
  if (!card) return;

  card.style.display = 'block';
  await loadAndRenderUnits();
}

// 关闭单位管理弹窗
function closeUnitManagement() {
  const card = $('unit-management-card');
  if (card) {
    card.style.display = 'none';
  }
}

// 加载并渲染单位列表
function loadAndRenderUnits() {
  const listEl = $('unit-list-manage');
  const statsEl = $('unit-stats');
  const searchInput = $('unit-search-input');

  if (!listEl) return;

  const allUnits = getUnits();

  // 统计使用情况
  const usageMap = {};
  store.ingredients.forEach(ing => {
    if (ing.unit) {
      usageMap[ing.unit] = (usageMap[ing.unit] || 0) + 1;
    }
  });

  // 搜索过滤
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filtered = allUnits.filter(unit => {
    if (!searchText) return true;
    return unit.toLowerCase().includes(searchText);
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">暂无单位数据</div>';
  } else {
    listEl.innerHTML = filtered.map(unit => {
      const usageCount = usageMap[unit] || 0;
      const usageText = usageCount > 0 ? `（${usageCount}个原料）` : '';
      return `
        <div class="unit-item-row" data-unit="${escapeHtml(unit)}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:6px; background:white;">
          <div style="flex:1; display:flex; align-items:center; gap:8px;">
            <strong class="unit-name-display" style="display:inline-block; min-width:80px;">${escapeHtml(unit)}</strong>
            <input type="text" class="unit-name-edit" value="${escapeHtml(unit)}" style="display:none; flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:14px;" />
            <span style="color:var(--text-secondary); font-size:12px;">${usageText}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn small" data-edit-unit="${escapeHtml(unit)}" data-save-unit="${escapeHtml(unit)}" style="font-size:12px; padding:4px 12px;">编辑</button>
            <button class="btn small" data-delete-unit="${escapeHtml(unit)}" style="font-size:12px; padding:4px 12px; background:#f44336; color:white;" ${usageCount > 0 ? 'disabled title="该单位正在使用中，无法删除"' : ''}>删除</button>
          </div>
        </div>
      `;
    }).join('');

    // 绑定编辑按钮
    listEl.querySelectorAll('[data-edit-unit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.editUnit;
        const row = listEl.querySelector(`[data-unit="${CSS.escape(unit)}"]`);
        if (row) {
          const displayEl = row.querySelector('.unit-name-display');
          const editEl = row.querySelector('.unit-name-edit');
          if (displayEl && editEl) {
            displayEl.style.display = 'none';
            editEl.style.display = 'block';
            editEl.focus();
            editEl.select();
            btn.textContent = '保存';
            btn.dataset.saving = 'true';
          }
        }
      });
    });

    // 绑定保存按钮
    listEl.querySelectorAll('[data-save-unit]').forEach(btn => {
      if (btn.dataset.saving === 'true') {
        btn.addEventListener('click', () => {
          const oldUnit = btn.dataset.saveUnit;
          const row = listEl.querySelector(`[data-unit="${CSS.escape(oldUnit)}"]`);
          if (row) {
            const editEl = row.querySelector('.unit-name-edit');
            const newUnit = editEl ? editEl.value.trim() : '';
            if (!newUnit) {
              alert('单位名称不能为空');
              return;
            }
            const unitsArr = getUnits();
            if (newUnit !== oldUnit && unitsArr.includes(newUnit)) {
              alert('该单位已存在');
              return;
            }
            const index = unitsArr.indexOf(oldUnit);
            if (index >= 0) {
              unitsArr[index] = newUnit;
              saveUnits(unitsArr);
              // 更新原料中的单位
              store.ingredients.forEach(ing => {
                if (ing.unit === oldUnit) {
                  ing.unit = newUnit;
                }
              });
              populateUnitSelect();
              loadAndRenderUnits();
            }
          }
        });
      }
    });

    // 绑定删除按钮
    listEl.querySelectorAll('[data-delete-unit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.deleteUnit;
        const usageCount = usageMap[unit] || 0;
        if (usageCount > 0) {
          alert('该单位正在使用中，无法删除');
          return;
        }
        if (confirm(`确定要删除单位"${unit}"吗？`)) {
          const unitsArr = getUnits();
          const index = unitsArr.indexOf(unit);
          if (index >= 0) {
            unitsArr.splice(index, 1);
            saveUnits(unitsArr);
            populateUnitSelect();
            loadAndRenderUnits();
          }
        }
      });
    });
  }

  // 更新统计信息
  if (statsEl) {
    const unitsArr = getUnits();
    const totalUnits = unitsArr.length;
    const usedUnits = Object.keys(usageMap).length;
    statsEl.textContent = `共 ${totalUnits} 个单位，其中 ${usedUnits} 个正在使用`;
  }

  // 绑定搜索事件（只绑定一次）
  if (searchInput && !searchInput._unitSearchBound) {
    searchInput._unitSearchBound = true;
    searchInput.addEventListener('input', () => {
      loadAndRenderUnits();
    });
  }
}

// 添加单位
function addUnit() {
  const inputEl = $('unit-add-input');
  if (!inputEl) return;

  const newUnit = inputEl.value.trim();
  if (!newUnit) {
    alert('单位名称不能为空');
    return;
  }

  const units = getUnits();
  if (units.includes(newUnit)) {
    alert('该单位已存在');
    return;
  }

  units.push(newUnit);
  units.sort();
  saveUnits(units);
  populateUnitSelect();
  loadAndRenderUnits();

  inputEl.value = '';
  inputEl.focus();
}

// 打开采购渠道管理弹窗
async function openSourceManagement() {
  const card = $('source-management-card');
  if (!card) return;
  
  card.style.display = 'block';
  await loadAndRenderSources();
}

// 关闭采购渠道管理弹窗
function closeSourceManagement() {
  const card = $('source-management-card');
  if (card) {
    card.style.display = 'none';
  }
}

// 加载并渲染采购渠道列表
function loadAndRenderSources() {
  const listEl = $('source-list-manage');
  const statsEl = $('source-stats');
  const searchInput = $('source-search-input');
  
  if (!listEl) return;
  
  const sources = getSources();
  
  // 应用搜索过滤
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filtered = sources.filter(source => {
    if (!searchText) return true;
    return source.toLowerCase().includes(searchText);
  });
  
  // 统计使用情况
  const usageMap = {};
  store.ingredients.forEach(ing => {
    if (ing.source) {
      usageMap[ing.source] = (usageMap[ing.source] || 0) + 1;
    }
  });
  
  // 渲染采购渠道列表
  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">暂无采购渠道数据</div>';
  } else {
    listEl.innerHTML = filtered.map(source => {
      const usageCount = usageMap[source] || 0;
      const usageText = usageCount > 0 ? `（${usageCount}个原料）` : '';
      return `
        <div class="source-item-row" data-source="${escapeHtml(source)}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:6px; background:white;">
          <div style="flex:1; display:flex; align-items:center; gap:8px;">
            <strong class="source-name-display" style="display:inline-block; min-width:100px;">${escapeHtml(source)}</strong>
            <input type="text" class="source-name-edit" value="${escapeHtml(source)}" style="display:none; flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:14px;" />
            <span style="color:var(--text-secondary); font-size:12px;">${usageText}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn small" data-edit-source="${escapeHtml(source)}" data-save-source="${escapeHtml(source)}" style="font-size:12px; padding:4px 12px;">编辑</button>
            <button class="btn small" data-delete-source="${escapeHtml(source)}" style="font-size:12px; padding:4px 12px; background:#f44336; color:white;" ${usageCount > 0 ? 'disabled title="该采购渠道正在使用中，无法删除"' : ''}>删除</button>
          </div>
        </div>
      `;
    }).join('');
    
    // 绑定事件
    listEl.querySelectorAll('[data-edit-source]').forEach(btn => {
      btn.addEventListener('click', () => {
        const source = btn.dataset.editSource;
        const row = listEl.querySelector(`[data-source="${escapeHtml(source)}"]`);
        if (row) {
          const displayEl = row.querySelector('.source-name-display');
          const editEl = row.querySelector('.source-name-edit');
          if (displayEl && editEl) {
            displayEl.style.display = 'none';
            editEl.style.display = 'block';
            editEl.focus();
            editEl.select();
            btn.textContent = '保存';
            btn.dataset.saving = 'true';
          }
        }
      });
    });
    
    listEl.querySelectorAll('[data-save-source]').forEach(btn => {
      if (btn.dataset.saving === 'true') {
        btn.addEventListener('click', () => {
          const oldSource = btn.dataset.saveSource;
          const row = listEl.querySelector(`[data-source="${escapeHtml(oldSource)}"]`);
          if (row) {
            const editEl = row.querySelector('.source-name-edit');
            const newSource = editEl ? editEl.value.trim() : '';
            if (!newSource) {
              alert('采购渠道名称不能为空');
              return;
            }
            if (newSource !== oldSource && sources.includes(newSource)) {
              alert('该采购渠道已存在');
              return;
            }
            // 更新采购渠道列表
            const index = sources.indexOf(oldSource);
            if (index >= 0) {
              sources[index] = newSource;
              saveSources(sources);
              // 更新原料中的采购渠道
              store.ingredients.forEach(ing => {
                if (ing.source === oldSource) {
                  ing.source = newSource;
                }
              });
              populateSourceSelect();
              loadAndRenderSources();
            }
          }
        });
      }
    });
    
    listEl.querySelectorAll('[data-delete-source]').forEach(btn => {
      btn.addEventListener('click', () => {
        const source = btn.dataset.deleteSource;
        const usageCount = usageMap[source] || 0;
        if (usageCount > 0) {
          alert('该采购渠道正在使用中，无法删除');
          return;
        }
        if (confirm(`确定要删除采购渠道"${source}"吗？`)) {
          const index = sources.indexOf(source);
          if (index >= 0) {
            sources.splice(index, 1);
            saveSources(sources);
            populateSourceSelect();
            loadAndRenderSources();
          }
        }
      });
    });
  }
  
  // 更新统计信息
  if (statsEl) {
    const totalSources = sources.length;
    const usedSources = Object.keys(usageMap).length;
    statsEl.textContent = `共 ${totalSources} 个采购渠道，其中 ${usedSources} 个正在使用`;
  }
}

// 添加采购渠道
function addSource() {
  const inputEl = $('source-add-input');
  if (!inputEl) return;
  
  const newSource = inputEl.value.trim();
  if (!newSource) {
    alert('采购渠道名称不能为空');
    return;
  }
  
  const sources = getSources();
  if (sources.includes(newSource)) {
    alert('该采购渠道已存在');
    return;
  }
  
  sources.push(newSource);
  sources.sort();
  saveSources(sources);
  populateSourceSelect();
  loadAndRenderSources();
  
  // 清空输入框
  inputEl.value = '';
  inputEl.focus();
}

// ========== 所属科目、部位、产地类型管理功能 ==========

// 打开所属科目管理弹窗
async function openSubjectManagement() {
  const card = $('subject-management-card');
  if (!card) return;
  
  card.style.display = 'block';
  await loadAndRenderSubjects();
}

// 关闭所属科目管理弹窗
function closeSubjectManagement() {
  const card = $('subject-management-card');
  if (card) {
    card.style.display = 'none';
  }
}

// 加载并渲染所属科目列表
function loadAndRenderSubjects() {
  const listEl = $('subject-list-manage');
  const statsEl = $('subject-stats');
  const searchInput = $('subject-search-input');
  
  if (!listEl) return;
  
  const subjects = getSubjects();
  
  // 应用搜索过滤
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filtered = subjects.filter(subject => {
    if (!searchText) return true;
    return subject.toLowerCase().includes(searchText);
  });
  
  // 统计使用情况（从后端加载的原料中统计）
  const usageMap = {};
  store.ingredients.forEach(ing => {
    if (ing.subject) {
      usageMap[ing.subject] = (usageMap[ing.subject] || 0) + 1;
    }
  });
  
  // 渲染所属科目列表
  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">暂无所属科目数据</div>';
  } else {
    listEl.innerHTML = filtered.map(subject => {
      const usageCount = usageMap[subject] || 0;
      const usageText = usageCount > 0 ? `（${usageCount}个原料）` : '';
      return `
        <div class="subject-item-row" data-subject="${escapeHtml(subject)}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:6px; background:white;">
          <div style="flex:1; display:flex; align-items:center; gap:8px;">
            <strong class="subject-name-display" style="display:inline-block; min-width:100px;">${escapeHtml(subject)}</strong>
            <input type="text" class="subject-name-edit" value="${escapeHtml(subject)}" style="display:none; flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:14px;" />
            <span style="color:var(--text-secondary); font-size:12px;">${usageText}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn small" data-edit-subject="${escapeHtml(subject)}" data-save-subject="${escapeHtml(subject)}" style="font-size:12px; padding:4px 12px;">编辑</button>
            <button class="btn small" data-delete-subject="${escapeHtml(subject)}" style="font-size:12px; padding:4px 12px; background:#f44336; color:white;" ${usageCount > 0 ? 'disabled title="该所属科目正在使用中，无法删除"' : ''}>删除</button>
          </div>
        </div>
      `;
    }).join('');
    
    // 绑定事件
    listEl.querySelectorAll('[data-edit-subject]').forEach(btn => {
      btn.addEventListener('click', () => {
        const subject = btn.dataset.editSubject;
        const row = listEl.querySelector(`[data-subject="${escapeHtml(subject)}"]`);
        if (row) {
          const displayEl = row.querySelector('.subject-name-display');
          const editEl = row.querySelector('.subject-name-edit');
          if (displayEl && editEl) {
            displayEl.style.display = 'none';
            editEl.style.display = 'block';
            editEl.focus();
            editEl.select();
            btn.textContent = '保存';
            btn.dataset.saving = 'true';
          }
        }
      });
    });
    
    listEl.querySelectorAll('[data-save-subject]').forEach(btn => {
      if (btn.dataset.saving === 'true') {
        btn.addEventListener('click', () => {
          const oldSubject = btn.dataset.saveSubject;
          const row = listEl.querySelector(`[data-subject="${escapeHtml(oldSubject)}"]`);
          if (row) {
            const editEl = row.querySelector('.subject-name-edit');
            const newSubject = editEl ? editEl.value.trim() : '';
            if (!newSubject) {
              alert('所属科目名称不能为空');
              return;
            }
            if (newSubject !== oldSubject && subjects.includes(newSubject)) {
              alert('该所属科目已存在');
              return;
            }
            // 更新所属科目列表
            const index = subjects.indexOf(oldSubject);
            if (index >= 0) {
              subjects[index] = newSubject;
              saveSubjects(subjects);
              populateSubjectSelect();
              // 更新原料中的所属科目
              store.ingredients.forEach(ing => {
                if (ing.subject === oldSubject) {
                  ing.subject = newSubject;
                }
              });
              loadAndRenderSubjects();
            }
          }
        });
      }
    });
    
    listEl.querySelectorAll('[data-delete-subject]').forEach(btn => {
      btn.addEventListener('click', () => {
        const subject = btn.dataset.deleteSubject;
        const usageCount = usageMap[subject] || 0;
        if (usageCount > 0) {
          alert('该所属科目正在使用中，无法删除');
          return;
        }
        if (confirm(`确定要删除所属科目"${subject}"吗？`)) {
          const index = subjects.indexOf(subject);
          if (index >= 0) {
            subjects.splice(index, 1);
            saveSubjects(subjects);
            populateSubjectSelect();
            loadAndRenderSubjects();
          }
        }
      });
    });
  }
  
  // 更新统计信息
  if (statsEl) {
    const totalSubjects = subjects.length;
    const usedSubjects = Object.keys(usageMap).length;
    statsEl.textContent = `共 ${totalSubjects} 个所属科目，其中 ${usedSubjects} 个正在使用`;
  }
}

// 添加所属科目
function addSubject() {
  const inputEl = $('subject-add-input');
  if (!inputEl) return;
  
  const newSubject = inputEl.value.trim();
  if (!newSubject) {
    alert('所属科目名称不能为空');
    return;
  }
  
  const subjects = getSubjects();
  if (subjects.includes(newSubject)) {
    alert('该所属科目已存在');
    return;
  }
  
  subjects.push(newSubject);
  subjects.sort();
  saveSubjects(subjects);
  populateSubjectSelect();
  loadAndRenderSubjects();
  
  // 清空输入框
  inputEl.value = '';
  inputEl.focus();
}

// 打开部位管理弹窗
async function openPartManagement() {
  const card = $('part-management-card');
  if (!card) return;
  
  card.style.display = 'block';
  await loadAndRenderParts();
}

// 关闭部位管理弹窗
function closePartManagement() {
  const card = $('part-management-card');
  if (card) {
    card.style.display = 'none';
  }
}

// 加载并渲染部位列表
function loadAndRenderParts() {
  const listEl = $('part-list-manage');
  const statsEl = $('part-stats');
  const searchInput = $('part-search-input');
  
  if (!listEl) return;
  
  const parts = getParts();
  
  // 应用搜索过滤
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filtered = parts.filter(part => {
    if (!searchText) return true;
    return part.toLowerCase().includes(searchText);
  });
  
  // 统计使用情况
  const usageMap = {};
  store.ingredients.forEach(ing => {
    if (ing.part) {
      usageMap[ing.part] = (usageMap[ing.part] || 0) + 1;
    }
  });
  
  // 渲染部位列表
  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">暂无部位数据</div>';
  } else {
    listEl.innerHTML = filtered.map(part => {
      const usageCount = usageMap[part] || 0;
      const usageText = usageCount > 0 ? `（${usageCount}个原料）` : '';
      return `
        <div class="part-item-row" data-part="${escapeHtml(part)}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:6px; background:white;">
          <div style="flex:1; display:flex; align-items:center; gap:8px;">
            <strong class="part-name-display" style="display:inline-block; min-width:100px;">${escapeHtml(part)}</strong>
            <input type="text" class="part-name-edit" value="${escapeHtml(part)}" style="display:none; flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:14px;" />
            <span style="color:var(--text-secondary); font-size:12px;">${usageText}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn small" data-edit-part="${escapeHtml(part)}" data-save-part="${escapeHtml(part)}" style="font-size:12px; padding:4px 12px;">编辑</button>
            <button class="btn small" data-delete-part="${escapeHtml(part)}" style="font-size:12px; padding:4px 12px; background:#f44336; color:white;" ${usageCount > 0 ? 'disabled title="该部位正在使用中，无法删除"' : ''}>删除</button>
          </div>
        </div>
      `;
    }).join('');
    
    // 绑定事件（类似所属科目的逻辑）
    listEl.querySelectorAll('[data-edit-part]').forEach(btn => {
      btn.addEventListener('click', () => {
        const part = btn.dataset.editPart;
        const row = listEl.querySelector(`[data-part="${escapeHtml(part)}"]`);
        if (row) {
          const displayEl = row.querySelector('.part-name-display');
          const editEl = row.querySelector('.part-name-edit');
          if (displayEl && editEl) {
            displayEl.style.display = 'none';
            editEl.style.display = 'block';
            editEl.focus();
            editEl.select();
            btn.textContent = '保存';
            btn.dataset.saving = 'true';
          }
        }
      });
    });
    
    listEl.querySelectorAll('[data-save-part]').forEach(btn => {
      if (btn.dataset.saving === 'true') {
        btn.addEventListener('click', () => {
          const oldPart = btn.dataset.savePart;
          const row = listEl.querySelector(`[data-part="${escapeHtml(oldPart)}"]`);
          if (row) {
            const editEl = row.querySelector('.part-name-edit');
            const newPart = editEl ? editEl.value.trim() : '';
            if (!newPart) {
              alert('部位名称不能为空');
              return;
            }
            if (newPart !== oldPart && parts.includes(newPart)) {
              alert('该部位已存在');
              return;
            }
            const index = parts.indexOf(oldPart);
            if (index >= 0) {
              parts[index] = newPart;
              saveParts(parts);
              populatePartSelect();
              store.ingredients.forEach(ing => {
                if (ing.part === oldPart) {
                  ing.part = newPart;
                }
              });
              loadAndRenderParts();
            }
          }
        });
      }
    });
    
    listEl.querySelectorAll('[data-delete-part]').forEach(btn => {
      btn.addEventListener('click', () => {
        const part = btn.dataset.deletePart;
        const usageCount = usageMap[part] || 0;
        if (usageCount > 0) {
          alert('该部位正在使用中，无法删除');
          return;
        }
        if (confirm(`确定要删除部位"${part}"吗？`)) {
          const index = parts.indexOf(part);
          if (index >= 0) {
            parts.splice(index, 1);
            saveParts(parts);
            populatePartSelect();
            loadAndRenderParts();
          }
        }
      });
    });
  }
  
  // 更新统计信息
  if (statsEl) {
    const totalParts = parts.length;
    const usedParts = Object.keys(usageMap).length;
    statsEl.textContent = `共 ${totalParts} 个部位，其中 ${usedParts} 个正在使用`;
  }
}

// 添加部位
function addPart() {
  const inputEl = $('part-add-input');
  if (!inputEl) return;
  
  const newPart = inputEl.value.trim();
  if (!newPart) {
    alert('部位名称不能为空');
    return;
  }
  
  const parts = getParts();
  if (parts.includes(newPart)) {
    alert('该部位已存在');
    return;
  }
  
  parts.push(newPart);
  parts.sort();
  saveParts(parts);
  populatePartSelect();
  loadAndRenderParts();
  
  // 清空输入框
  inputEl.value = '';
  inputEl.focus();
}

// 打开产地类型管理弹窗
async function openOriginTypeManagement() {
  const card = $('origin-type-management-card');
  if (!card) return;
  
  card.style.display = 'block';
  await loadAndRenderOriginTypes();
}

// 关闭产地类型管理弹窗
function closeOriginTypeManagement() {
  const card = $('origin-type-management-card');
  if (card) {
    card.style.display = 'none';
  }
}

// 加载并渲染产地类型列表
function loadAndRenderOriginTypes() {
  const listEl = $('origin-type-list-manage');
  const statsEl = $('origin-type-stats');
  const searchInput = $('origin-type-search-input');
  
  if (!listEl) return;
  
  const originTypes = getOriginTypes();
  
  // 应用搜索过滤
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filtered = originTypes.filter(type => {
    if (!searchText) return true;
    return type.toLowerCase().includes(searchText);
  });
  
  // 统计使用情况
  const usageMap = {};
  store.ingredients.forEach(ing => {
    if (ing.originType) {
      usageMap[ing.originType] = (usageMap[ing.originType] || 0) + 1;
    }
  });
  
  // 渲染产地类型列表
  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">暂无产地类型数据</div>';
  } else {
    listEl.innerHTML = filtered.map(type => {
      const usageCount = usageMap[type] || 0;
      const usageText = usageCount > 0 ? `（${usageCount}个原料）` : '';
      return `
        <div class="origin-type-item-row" data-origin-type="${escapeHtml(type)}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:6px; background:white;">
          <div style="flex:1; display:flex; align-items:center; gap:8px;">
            <strong class="origin-type-name-display" style="display:inline-block; min-width:100px;">${escapeHtml(type)}</strong>
            <input type="text" class="origin-type-name-edit" value="${escapeHtml(type)}" style="display:none; flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:14px;" />
            <span style="color:var(--text-secondary); font-size:12px;">${usageText}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn small" data-edit-origin-type="${escapeHtml(type)}" data-save-origin-type="${escapeHtml(type)}" style="font-size:12px; padding:4px 12px;">编辑</button>
            <button class="btn small" data-delete-origin-type="${escapeHtml(type)}" style="font-size:12px; padding:4px 12px; background:#f44336; color:white;" ${usageCount > 0 ? 'disabled title="该产地类型正在使用中，无法删除"' : ''}>删除</button>
          </div>
        </div>
      `;
    }).join('');
    
    // 绑定事件（类似所属科目的逻辑）
    listEl.querySelectorAll('[data-edit-origin-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.editOriginType;
        const row = listEl.querySelector(`[data-origin-type="${escapeHtml(type)}"]`);
        if (row) {
          const displayEl = row.querySelector('.origin-type-name-display');
          const editEl = row.querySelector('.origin-type-name-edit');
          if (displayEl && editEl) {
            displayEl.style.display = 'none';
            editEl.style.display = 'block';
            editEl.focus();
            editEl.select();
            btn.textContent = '保存';
            btn.dataset.saving = 'true';
          }
        }
      });
    });
    
    listEl.querySelectorAll('[data-save-origin-type]').forEach(btn => {
      if (btn.dataset.saving === 'true') {
        btn.addEventListener('click', () => {
          const oldType = btn.dataset.saveOriginType;
          const row = listEl.querySelector(`[data-origin-type="${escapeHtml(oldType)}"]`);
          if (row) {
            const editEl = row.querySelector('.origin-type-name-edit');
            const newType = editEl ? editEl.value.trim() : '';
            if (!newType) {
              alert('产地类型名称不能为空');
              return;
            }
            if (newType !== oldType && originTypes.includes(newType)) {
              alert('该产地类型已存在');
              return;
            }
            const index = originTypes.indexOf(oldType);
            if (index >= 0) {
              originTypes[index] = newType;
              saveOriginTypes(originTypes);
              populateOriginTypeSelect();
              store.ingredients.forEach(ing => {
                if (ing.originType === oldType) {
                  ing.originType = newType;
                }
              });
              loadAndRenderOriginTypes();
            }
          }
        });
      }
    });
    
    listEl.querySelectorAll('[data-delete-origin-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.deleteOriginType;
        const usageCount = usageMap[type] || 0;
        if (usageCount > 0) {
          alert('该产地类型正在使用中，无法删除');
          return;
        }
        if (confirm(`确定要删除产地类型"${type}"吗？`)) {
          const index = originTypes.indexOf(type);
          if (index >= 0) {
            originTypes.splice(index, 1);
            saveOriginTypes(originTypes);
            populateOriginTypeSelect();
            loadAndRenderOriginTypes();
          }
        }
      });
    });
  }
  
  // 更新统计信息
  if (statsEl) {
    const totalTypes = originTypes.length;
    const usedTypes = Object.keys(usageMap).length;
    statsEl.textContent = `共 ${totalTypes} 个产地类型，其中 ${usedTypes} 个正在使用`;
  }
}

// 添加产地类型
function addOriginType() {
  const inputEl = $('origin-type-add-input');
  if (!inputEl) return;
  
  const newType = inputEl.value.trim();
  if (!newType) {
    alert('产地类型名称不能为空');
    return;
  }
  
  const originTypes = getOriginTypes();
  if (originTypes.includes(newType)) {
    alert('该产地类型已存在');
    return;
  }
  
  originTypes.push(newType);
  originTypes.sort();
  saveOriginTypes(originTypes);
  populateOriginTypeSelect();
  loadAndRenderOriginTypes();
  
  // 清空输入框
  inputEl.value = '';
  inputEl.focus();
}

// ========== 主要营养素管理功能 ==========

// 打开主要营养素管理弹窗
async function openMainNutrientManagement() {
  const card = $('main-nutrient-management-card');
  if (!card) return;
  
  card.style.display = 'block';
  await loadAndRenderMainNutrients();
}

// 关闭主要营养素管理弹窗
function closeMainNutrientManagement() {
  const card = $('main-nutrient-management-card');
  if (card) card.style.display = 'none';
}

// 加载并渲染主要营养素列表
async function loadAndRenderMainNutrients() {
  const listEl = $('main-nutrient-list-manage');
  const statsEl = $('main-nutrient-stats');
  const searchInput = $('main-nutrient-search-input');
  
  if (!listEl) return;
  
  const mainNutrients = getMainNutrients();
  
  // 应用搜索过滤
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const filtered = searchText 
    ? mainNutrients.filter(n => n.toLowerCase().includes(searchText))
    : mainNutrients;
  
  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="muted" style="padding:16px; text-align:center;">暂无主要营养素</div>';
  } else {
    listEl.innerHTML = filtered.map(nutrient => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:var(--bg-secondary); border-radius:4px;">
        <span>${escapeHtml(nutrient)}</span>
        <button type="button" class="btn small ghost" data-delete-main-nutrient="${escapeHtml(nutrient)}">删除</button>
      </div>
    `).join('');
    
    // 绑定删除按钮事件
    listEl.querySelectorAll('[data-delete-main-nutrient]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nutrient = btn.dataset.deleteMainNutrient;
        if (confirm(`确定要删除"${nutrient}"吗？`)) {
          const nutrients = getMainNutrients();
          const updated = nutrients.filter(n => n !== nutrient);
          saveMainNutrients(updated);
          populateMainNutrientSelect();
          loadAndRenderMainNutrients();
        }
      });
    });
  }
  
  // 更新统计信息
  if (statsEl) {
    const total = mainNutrients.length;
    statsEl.textContent = `共 ${total} 个主要营养素`;
  }
}

// 添加主要营养素
function addMainNutrient() {
  const inputEl = $('main-nutrient-add-input');
  if (!inputEl) return;
  
  const newNutrient = inputEl.value.trim();
  if (!newNutrient) {
    alert('请输入主要营养素名称');
    return;
  }
  
  const nutrients = getMainNutrients();
  if (nutrients.includes(newNutrient)) {
    alert('该主要营养素已存在');
    return;
  }
  
  nutrients.push(newNutrient);
  saveMainNutrients(nutrients);
  populateMainNutrientSelect();
  loadAndRenderMainNutrients();
  
  // 清空输入框
  inputEl.value = '';
  inputEl.focus();
}

console.log('[app.js] 文件加载完成，准备初始化...');
console.log('[app.js] document.readyState:', document.readyState);
if (document.readyState === 'loading') {
  console.log('[app.js] DOM未加载完成，等待DOMContentLoaded事件...');
  window.addEventListener('DOMContentLoaded', () => {
    console.log('[app.js] DOMContentLoaded事件触发，调用init()...');
    init();
  });
} else {
  console.log('[app.js] DOM已加载，立即调用init()...');
  init();
}
