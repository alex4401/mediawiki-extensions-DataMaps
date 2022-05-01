import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.cluster import MeanShift


def load_data():
    dataset = pd.read_csv("./data/data.csv", names=("resource","lat","lon",'z','cave'), header=0, index_col=False)
    print(dataset.head())
    return dataset


def unique_resources(dataset):
    for resource in pd.unique(dataset.resource):
        yield resource


def filtered_by_resource(dataset, resource:str, cave:bool):
    return dataset[(dataset.resource == resource) & (dataset.cave == (cave and 1 or 0))][['lat','lon']]


def do_clustering(dataset, bw=0.2):
    ms = MeanShift(bandwidth=bw, bin_seeding=True)
    ms.fit(dataset)
    labels = ms.labels_
    cluster_centers = ms.cluster_centers_
    return labels, cluster_centers


def output(centers, filename):
    pd.DataFrame(centers).to_csv(filename, index=False, line_terminator='\n')


dataset = load_data()
# data = filtered_by_resource(data, 'obsidian')
for bw in (0.6): #(0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, ):
    for resource in unique_resources(dataset): # ('obsidian', 'gem-red'): #
        for in_cave in (True, False):
            data = filtered_by_resource(dataset, resource, in_cave)
            if len(data) == 0:
                continue

            labels, centers = do_clustering(data, bw)
            location = 'cave' if in_cave else 'surface'
            output(centers, f'output/{resource}-{location}-{bw}.csv')
